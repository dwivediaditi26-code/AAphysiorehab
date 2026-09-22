/**
 * Shoulder Flexion tracker. Assumes standing, side-on camera — flexion
 * (raising the arm forward) is a sagittal-plane movement, so it actually
 * works from the side, unlike abduction (raising out to the side), which
 * needs a frontal camera (see shoulderAbductionTracker.js).
 *
 * Signal: the actual joint angle, not a distance heuristic. Goniometric
 * flexion is measured at the shoulder between the trunk and the humerus
 * (arm at the side = 0 deg, arm raised forward to horizontal = ~90 deg);
 * the pose-estimation literature's standard stand-in for that is the
 * hip-shoulder-elbow angle (trunk direction = hip->shoulder, upper-arm
 * direction = shoulder->elbow) — the same construction this app already
 * uses for every other joint angle (angleAtAspect, hip-knee-ankle etc.),
 * just applied to the shoulder. Published 2D pose-estimation studies using
 * this exact hip-shoulder-elbow definition report ~9-13 deg mean error
 * against 3D motion capture — a reasonable single-camera baseline, not
 * goniometer-grade.
 *
 * NEAR-SIDE only, not an average of both arms — from a true side view the
 * far shoulder/elbow sit behind the near ones and MediaPipe guesses their
 * position, same reasoning as every other side-view signal in this app
 * (hipExtensionSignal.js etc.). Side is chosen by visibility with hysteresis
 * so two similar-looking sides can't flip-flop frame to frame; there's no
 * per-patient baseline here to corrupt on a flip (fixed degree thresholds,
 * same for both sides), unlike the bridge signal.
 *
 * Previously this tracker predated repCounter.js (see repCounter.js's own
 * header) and had that exact double-counting bug: a single noisy frame
 * crossing back below the exit threshold, with no debounce, counted "rep
 * finished, new rep started" on a momentary blip. Now built on the shared,
 * time-debounced counter like every other rep-based tracker.
 * ENTER/EXIT/target are fixed degree thresholds, not per-patient calibrated
 * — a draft, reasonable for "raise to about shoulder height," not tuned per
 * body type or validated on real footage.
 */
import { angleAtAspect, clamp01 } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

const CHAIN = {
  left: { hip: 23, shoulder: 11, elbow: 13 },
  right: { hip: 24, shoulder: 12, elbow: 14 },
};

export function createShoulderFlexionTracker(config = {}) {
  const REST_ANGLE = config.restAngle ?? 10;     // deg, arm relaxed at the side
  const TARGET_ANGLE = config.targetAngle ?? 90;  // deg, "raise forward to shoulder height"
  const SPEED_FLAG = config.speedFlag ?? 3.5;     // range-widths / second, framerate independent

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 });
  const state = { lastExt: 0, side: "left", history: [], maxRate: 0, feedbackFlags: new Set() };

  function chooseSide(landmarks) {
    const vis = (i) => landmarks[i].visibility ?? 1;
    const score = (s) => { const c = CHAIN[s]; return vis(c.hip) + vis(c.shoulder) + vis(c.elbow); };
    // hysteresis: only switch sides when the other is clearly better
    if (state.side === "left" && score("right") > score("left") + 0.3) state.side = "right";
    else if (state.side === "right" && score("left") > score("right") + 0.3) state.side = "left";
  }

  return {
    /** meta.aspect = videoWidth / videoHeight (needed for correct angles). */
    processFrame(landmarks, now = Date.now(), meta = {}) {
      if (!landmarks || landmarks.length < 29) return state;
      chooseSide(landmarks);
      const c = CHAIN[state.side];
      const angle = angleAtAspect(landmarks[c.hip], landmarks[c.shoulder], landmarks[c.elbow], meta.aspect);
      const ext = clamp01((angle - REST_ANGLE) / (TARGET_ANGLE - REST_ANGLE));

      const wasActive = counter.isActive();
      if (wasActive) {
        state.history.push({ t: now, ext });
        while (state.history.length && now - state.history[0].t > 300) state.history.shift();
        const ref = state.history.find((h) => now - h.t >= 100);
        if (ref) {
          const rate = Math.abs(ext - ref.ext) / ((now - ref.t) / 1000);
          if (rate > state.maxRate) state.maxRate = rate;
        }
      } else {
        state.history.length = 0;
      }
      state.lastExt = ext;

      const completed = counter.update(ext, now);
      if (completed && state.maxRate > SPEED_FLAG) state.feedbackFlags.add("speed");

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxRate = 0; state.history = [];
      }

      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (out.length === 0) out.push(M.goodShoulderFlexion);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.side = "left"; state.history = []; state.maxRate = 0; state.feedbackFlags = new Set();
    },
  };
}
