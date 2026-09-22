/**
 * Hip-extension signal for bridging (Glute Bridge, Single Leg Bridge):
 * turns landmarks into a 0..1 "how far up is the bridge" value, robustly.
 *
 * Every choice here comes from analysing a real side-view bridge clip with
 * MediaPipe (rest 122-130 deg, lift ~0.5 s, hold 176-180 deg):
 *
 *  1. NEAR-SIDE chain, not a left/right average. Side-on, the far hip/knee
 *     are hidden and MediaPipe invents them (far knee visibility 0.34 for
 *     the whole clip). Averaging near + invented halves the accuracy, so the
 *     angle uses only the side the camera actually sees (mode 'nearSide').
 *     'average' mode (Single Leg Bridge, which needs both legs) instead
 *     weights each side by its visibility so a guessed joint counts for less.
 *  2. ASPECT-CORRECT angles (x scaled by width/height) — see angleAtAspect().
 *  3. PER-PATIENT baseline. Resting hip angle varies 100-135 deg with body
 *     shape and how far the feet are from the hips. A fixed 110 deg "rest"
 *     put the return threshold inside the resting noise. We measure the
 *     patient's own rest (first stable ~0.5 s) and express the lift relative
 *     to it: 0 = resting, 1 = full extension (>= targetAngle, default 170).
 *  3b. Median-of-5 on the angle, so one bad frame can't spike the signal.
 *  4. Low-confidence frames are REPORTED as invalid (valid:false) rather than
 *     fed into the state machine — the tracker just skips them, so a bad
 *     frame can never invent or cancel a rep.
 *  4b. NEAR SIDE IS LOCKED once the rest baseline is calibrated. Which side of
 *     the body faces the camera is a property of the room, not something that
 *     changes frame to frame — but before this fix chooseSide() re-picked it
 *     on EVERY frame from instant visibility scores. Deliberately lifting a
 *     leg (or any brief motion) makes that leg's joints momentarily much more
 *     visible than the true near side and can flip `side` for good. The `rest`
 *     baseline was calibrated for the OLD side's geometry, so after a flip the
 *     angle computed from the NEW side's landmarks no longer relates to it —
 *     `ext` can get stuck near 0 (never re-enters "active") or near 1 (never
 *     returns below "exit"), and the tracker stops counting reps for the rest
 *     of the session. Fix: choose the side freely only until the baseline is
 *     calibrated, then freeze it for the session (reset() unfreezes it).
 *  5. TWO REFERENCES. The angle above needs the shoulder in frame. With the
 *     phone close or held portrait the head and shoulders are often out of
 *     shot, so when the shoulder is not reliably inside the image we measure
 *     the pelvis and thigh only (pelvicLiftSignal.js: pelvis rise in thigh
 *     lengths) — the same "pelvis and lower limb" the framing check asks for.
 *     Both run every frame so their rest baselines calibrate together. The
 *     choice is made on the first frame and is one-way: 'torso' switches to
 *     'lowerBody' if the shoulder stays unreliable for ~1 s, never back, so a
 *     shoulder flickering at the edge of the picture can't flip the signal.
 *     `reference` in the result says which is in use; `raw` is that
 *     reference's own value (degrees for 'torso', thigh lengths for
 *     'lowerBody') and is what relaxRest() wants.
 *
 * Pure JS, no dependencies.
 */
import { angleAtAspect, clamp01, median } from "./trackingMath.js";
import { createPelvicLiftSignal } from "./pelvicLiftSignal.js";

const CHAIN = {
  left: { shoulder: 11, hip: 23, knee: 25 },
  right: { shoulder: 12, hip: 24, knee: 26 },
};

export function createHipExtensionSignal(config = {}) {
  const MODE = config.mode ?? "nearSide";            // 'nearSide' | 'average'
  const LOWER_FALLBACK = config.lowerBodyFallback ?? true;   // measure pelvis-only when the shoulder isn't reliably in frame
  const SHOULDER_MIN_VIS = config.shoulderMinVisibility ?? 0.5;
  const TORSO_LOST_FRAMES = config.torsoLostFrames ?? 30;    // ~1 s of an unreliable shoulder before switching for good
  const REST_DEFAULT = config.restDefault ?? 125;    // deg, used until/unless a stable rest is measured
  const TARGET = config.targetAngle ?? 170;          // deg = full extension
  const MIN_RANGE = config.minRange ?? 35;           // never let (target - rest) shrink below this
  const MIN_VIS = config.minVisibility ?? 0.3;
  const CAL_FRAMES = config.calFrames ?? 15;         // ~0.5 s at 30 fps
  const CAL_TOL = config.calTolerance ?? 6;          // deg spread allowed while "still"
  const CAL_GIVE_UP = config.calGiveUp ?? 90;        // frames, then fall back to REST_DEFAULT
  const REST_MIN = 90, REST_MAX = 150;              // plausible resting hip angle when lying knees-bent

  const pelvic = createPelvicLiftSignal({ mode: MODE, ...config.pelvic });
  let reference = null; // 'torso' | 'lowerBody' — decided on the first frame, see header note 5
  let torsoLost = 0;

  let side = "left";
  let sideLocked = false; // frozen once the rest baseline is calibrated — see header note 4b
  let rest = REST_DEFAULT;
  let calibrated = false;
  let framesSeen = 0;
  const raw = [];    // last 5 angles (median filter)
  const recent = []; // last CAL_FRAMES filtered angles (calibration window)

  // A shoulder we can trust: seen with confidence AND actually inside the image
  // (a shoulder MediaPipe places outside the frame is a guess, however sure it sounds).
  const shoulderReliable = (p) =>
    (p.visibility ?? 1) >= SHOULDER_MIN_VIS && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
  const calibratedNow = () => (reference === "lowerBody" ? pelvic.isCalibrated() : calibrated);

  function pick(landmarks, joint) {
    if (MODE === "nearSide") return landmarks[CHAIN[side][joint]];
    // 'average': visibility-weighted mean of left & right
    const a = landmarks[CHAIN.left[joint]], b = landmarks[CHAIN.right[joint]];
    const va = a.visibility ?? 1, vb = b.visibility ?? 1;
    const w = va + vb;
    if (w < MIN_VIS) return null;
    return { x: (a.x * va + b.x * vb) / w, y: (a.y * va + b.y * vb) / w, visibility: Math.max(va, vb) };
  }

  function chooseSide(landmarks) {
    if (sideLocked) return; // frozen — see header note 4b
    const score = (s) => Object.values(CHAIN[s]).reduce((t, i) => t + (landmarks[i].visibility ?? 1), 0);
    // hysteresis: only switch sides when the other is clearly better
    if (side === "left" && score("right") > score("left") + 0.3) side = "right";
    else if (side === "right" && score("left") > score("right") + 0.3) side = "left";
  }

  return {
    /** Returns { valid, ext, raw, reference, side, calibrated } plus, for the
     * 'torso' reference, { angle, restAngle, targetAngle }. */
    process(landmarks, meta = {}) {
      if (!landmarks || landmarks.length < 27) return { valid: false, calibrated: calibratedNow(), restAngle: rest };
      if (MODE === "nearSide") chooseSide(landmarks);

      const shoulder = pick(landmarks, "shoulder"), hip = pick(landmarks, "hip"), knee = pick(landmarks, "knee");

      if (LOWER_FALLBACK) {
        const lower = pelvic.process(landmarks, meta); // runs every frame so both baselines calibrate together
        const torsoUsable = !!shoulder && shoulderReliable(shoulder);
        if (reference === null) reference = torsoUsable ? "torso" : "lowerBody";
        else if (reference === "torso") {
          torsoLost = torsoUsable ? 0 : torsoLost + 1;
          if (torsoLost >= TORSO_LOST_FRAMES) reference = "lowerBody";
        }
        if (reference === "lowerBody") return { ...lower, reference };
      } else if (reference === null) {
        reference = "torso";
      }

      if (!shoulder || !hip || !knee) return { valid: false, calibrated, restAngle: rest, reference };
      const minVis = Math.min(shoulder.visibility ?? 1, hip.visibility ?? 1, knee.visibility ?? 1);
      if (minVis < MIN_VIS) return { valid: false, calibrated, restAngle: rest, reference };

      raw.push(angleAtAspect(shoulder, hip, knee, meta.aspect));
      if (raw.length > 5) raw.shift();
      const angle = median(raw);
      framesSeen++;

      // --- per-patient rest baseline ---
      recent.push(angle);
      if (recent.length > CAL_FRAMES) recent.shift();
      if (!calibrated) {
        if (recent.length === CAL_FRAMES && Math.max(...recent) - Math.min(...recent) < CAL_TOL) {
          const m = median(recent);
          if (m >= REST_MIN && m <= REST_MAX) { rest = m; calibrated = true; }
        }
        if (!calibrated && framesSeen >= CAL_GIVE_UP) calibrated = true; // keep REST_DEFAULT
      }
      if (calibrated) sideLocked = true;

      const target = Math.max(TARGET, rest + MIN_RANGE);
      const ext = clamp01((angle - rest) / (target - rest));
      return { valid: true, angle, raw: angle, ext, side, calibrated, restAngle: rest, targetAngle: target, reference };
    },
    /** Let the baseline drift DOWN only (patient relaxes flatter); never up,
     * so holding a half-lift can't quietly raise "rest". Pass the `raw` value
     * from process() (the pelvic reference tracks its own last position). */
    relaxRest(rawValue) {
      if (reference === "lowerBody") { pelvic.relaxRest(); return; }
      if (calibrated && rawValue < rest - 3 && rawValue >= REST_MIN) rest = rest * 0.9 + rawValue * 0.1;
    },
    isCalibrated() { return calibratedNow(); },
    /** Resting value of the reference in use: degrees ('torso') or image y ('lowerBody'). */
    getRest() { return reference === "lowerBody" ? pelvic.getRest() : rest; },
    /** 'torso' | 'lowerBody' | null (nothing seen yet). */
    getReference() { return reference; },
    reset() {
      side = "left"; sideLocked = false; rest = REST_DEFAULT; calibrated = false; framesSeen = 0;
      raw.length = 0; recent.length = 0;
      pelvic.reset(); reference = null; torsoLost = 0;
    },
  };
}
