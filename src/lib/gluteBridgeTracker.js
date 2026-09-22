/**
 * Glute Bridge tracker. Landmarks in, debounced rep counter
 * (repCounter.js), form checks out.
 *
 * Assumes a SIDE-ON camera, patient supine, knees bent, feet flat.
 * Signal (hipExtensionSignal.js): near-side shoulder-hip-knee angle,
 * aspect-corrected, median-filtered, measured relative to THIS patient's own
 * resting angle. 0 = resting, 1 = full extension (~170 deg). When the
 * shoulder isn't reliably in frame (phone close / portrait) the same 0..1
 * comes from the pelvis and thigh alone (pelvicLiftSignal.js), so the
 * exercise needs only the pelvis and lower limb on camera.
 *
 * Reference from a real clip (studio demo, MediaPipe Pose Full): rest
 * 125 deg (122-130), lift 0.55 s, hold 178 deg +/- 1.3. Numbers below are
 * derived from that and are still a DRAFT until validated on your own
 * patients' footage (correct AND deliberately wrong reps) — see
 * test-fixtures/ and test-trackers.mjs.
 *
 * Form checks (only ones a side camera can measure reliably):
 *   - speed:    lifted/lowered faster than ~3.5 range-widths per second
 *   - dip:      dropped >= 25% of the range mid-rep and came back up (hips sagged)
 *   - height:   rep peaked below 70% of the range (didn't lift high enough)
 *   - legLifted: the near-side knee straightened well past where the rep
 *     started — a leg lifting/extending off the mat, not a two-leg bridge.
 *     Measured against THIS REP's own starting knee angle (planted-foot
 *     bridges naturally open the knee angle some as the hips rise — ~16 deg
 *     in the reference clip — so the threshold has to clear that margin).
 *     Draft threshold from one clip with no real "lifted a leg" footage;
 *     validate like the others in test-fixtures/. Catches a leg straightening
 *     out; a bent-knee march (knee angle roughly unchanged, whole leg lifts)
 *     would not trip this — no footage of that either.
 * Removed on purpose: the old "keep hips level" flag compared left vs right
 * hip height — in a side view both hips overlap, so it measured noise and
 * fired false corrections. Left/right symmetry needs a front/foot-end view.
 * Also not measurable from a camera: "core/glutes engaged", and over-arching
 * (an unsigned joint angle can't tell 180 from 190 deg).
 */
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";
import { createHipExtensionSignal } from "./hipExtensionSignal.js";
import { angleAtAspect } from "./trackingMath.js";

// Near-side hip/knee/ankle, matching the side hipExtensionSignal.js locks onto
// (its `side` result — see createHipExtensionSignal's near-side lock).
const LEG = {
  left: { hip: 23, knee: 25, ankle: 27 },
  right: { hip: 24, knee: 26, ankle: 28 },
};

export function createGluteBridgeTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 3.5;   // range-widths / second
  const DIP_DEPTH = config.dipDepth ?? 0.25;    // fraction of range dropped mid-rep
  const DIP_RECOVER = config.dipRecover ?? 0.15;
  const LIFT_FLAG = config.liftFlag ?? 0.7;     // peak below this = "lift higher"
  const GOOD_TOP = config.goodTop ?? 0.85;      // counts as "at the top" (hold timing)
  const KNEE_LIFT_FLAG = config.kneeLiftFlag ?? 30; // degrees the near-side knee may open from the rep's own start before we call it a lifted leg
  const KNEE_MIN_VIS = config.kneeMinVisibility ?? 0.3;

  const signal = createHipExtensionSignal(config.signal);
  // Bridging returns are deliberate (>= ~1 s), so a longer debounce than the
  // 200 ms default costs nothing and makes a noisy dip at the top harmless.
  const counter = createRepCounter({
    enter: config.enter ?? 0.5,
    exit: config.exit ?? 0.15,
    minPeak: config.minPeak ?? 0.5,
    exitDebounceMs: config.exitDebounceMs ?? 350,
  });

  function fresh() {
    return {
      lastExt: 0, valid: false, angle: 0, side: null, calibrated: false,
      feedbackFlags: new Set(),
      history: [],            // [{t, ext}] last ~300 ms, for framerate-independent speed
      maxRate: 0,
      hi: 0, peak: 0, dipping: false, dipMin: 1,  // dip detector (hi resets after a dip; peak never does)
      topSince: null, topMs: 0,                   // time spent near the top this rep
      activeSince: null,
      kneeStart: null, kneeMaxDev: 0,              // leg-lift detector: this rep's starting knee angle, max drift from it
      lastRep: null,
    };
  }
  let s = fresh();

  function rateNow(t, ext) {
    s.history.push({ t, ext });
    while (s.history.length && t - s.history[0].t > 300) s.history.shift();
    const ref = s.history.find((h) => t - h.t >= 100); // oldest sample that's >= 100 ms back
    if (!ref) return 0;
    return Math.abs(ext - ref.ext) / ((t - ref.t) / 1000);
  }

  return {
    /** meta.aspect = videoWidth / videoHeight (needed for correct angles). */
    processFrame(landmarks, now = Date.now(), meta = {}) {
      const r = signal.process(landmarks, meta);
      s.valid = r.valid; s.calibrated = r.calibrated; s.side = r.side ?? s.side;
      if (!r.valid) return s;        // bad frame: skip it entirely, never guess
      if (r.angle !== undefined) s.angle = r.angle;  // only the torso reference has a joint angle

      // Near-side knee angle — independent of which reference (torso/pelvis)
      // is driving the hip-extension signal, and computed fresh every frame
      // so it can't be corrupted by anything upstream.
      const legIdx = LEG[s.side] || LEG.left;
      const hipP = landmarks[legIdx.hip], kneeP = landmarks[legIdx.knee], ankleP = landmarks[legIdx.ankle];
      let kneeAngle = null;
      if (hipP && kneeP && ankleP) {
        const minKneeVis = Math.min(hipP.visibility ?? 1, kneeP.visibility ?? 1, ankleP.visibility ?? 1);
        if (minKneeVis >= KNEE_MIN_VIS) kneeAngle = angleAtAspect(hipP, kneeP, ankleP, meta.aspect);
      }

      const ext = r.ext;
      const wasActive = counter.isActive();

      if (wasActive) {
        const rate = rateNow(now, ext);
        if (rate > s.maxRate) s.maxRate = rate;

        // dip / sag detector: a real drop that then recovers within the same rep
        if (ext > s.hi) s.hi = ext;
        if (ext > s.peak) s.peak = ext;
        if (!s.dipping && s.hi >= GOOD_TOP && ext < s.hi - DIP_DEPTH) { s.dipping = true; s.dipMin = ext; }
        if (s.dipping) {
          if (ext < s.dipMin) s.dipMin = ext;
          if (ext > s.dipMin + DIP_RECOVER) { s.feedbackFlags.add("dip"); s.dipping = false; s.hi = ext; }
        }

        // leg-lift detector: how far has the near-side knee opened from where
        // THIS rep started (see header note above KNEE_LIFT_FLAG)?
        if (kneeAngle !== null && s.kneeStart !== null) {
          const dev = kneeAngle - s.kneeStart;
          if (dev > s.kneeMaxDev) s.kneeMaxDev = dev;
        }

        // time at the top (for rep stats)
        if (ext >= GOOD_TOP) { if (s.topSince === null) s.topSince = now; }
        else if (s.topSince !== null) { s.topMs += now - s.topSince; s.topSince = null; }
      } else {
        s.history.length = 0;
        signal.relaxRest(r.raw);
      }
      s.lastExt = ext;

      const completed = counter.update(ext, now);

      if (completed) {
        if (s.topSince !== null) { s.topMs += now - s.topSince; s.topSince = null; }
        const peakExt = s.peak;
        if (s.maxRate > SPEED_FLAG) s.feedbackFlags.add("speed");
        if (peakExt < LIFT_FLAG) s.feedbackFlags.add("lift");
        if (s.kneeMaxDev > KNEE_LIFT_FLAG) s.feedbackFlags.add("legLifted");
        s.lastRep = { peakExt, topMs: s.topMs, durationMs: s.activeSince ? now - s.activeSince : null, flags: [...s.feedbackFlags] };
      }

      if (!wasActive && counter.isActive()) {
        // new rep starting: previous rep's flags don't carry over
        s.feedbackFlags = new Set();
        s.maxRate = 0; s.hi = ext; s.peak = ext; s.dipping = false; s.dipMin = 1;
        s.topSince = null; s.topMs = 0; s.activeSince = now;
        s.kneeStart = kneeAngle; s.kneeMaxDev = 0;
      }

      return s;
    },
    getRepCount() { return counter.getRepCount(); },
    getPhase() { return counter.isActive() ? "rising" : "idle"; },
    getExtension() { return s.lastExt; },
    /** 'calibrating' until the patient's resting angle has been measured. */
    getStatusHint() { return s.calibrated ? null : "calibrating"; },
    /** 'torso' (shoulder-hip-knee angle) or 'lowerBody' (pelvis rise) — see hipExtensionSignal.js. */
    getSignalReference() { return signal.getReference(); },
    /** 'left' | 'right' | null — the near side, locked once calibrated (see hipExtensionSignal.js note 4b). */
    getSide() { return s.side; },
    getLastRepStats() { return s.lastRep; },
    getFeedback() {
      const out = [];
      // Wrong exercise (a leg lifted) outranks pace/height/sag — lead with it.
      if (s.feedbackFlags.has("legLifted")) out.push(M.keepKneeBent);
      if (s.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (s.feedbackFlags.has("dip")) out.push(M.keepHipsUp);
      if (s.feedbackFlags.has("lift")) out.push(M.liftHipsHigher);
      if (out.length === 0) out.push(M.goodBridgeHeight);
      return out;
    },
    reset() {
      counter.reset(); signal.reset();
      s = fresh();
    },
  };
}
