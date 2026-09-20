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
 *
 * Pure JS, no dependencies.
 */
import { angleAtAspect, clamp01, median } from "./trackingMath.js";

const CHAIN = {
  left: { shoulder: 11, hip: 23, knee: 25 },
  right: { shoulder: 12, hip: 24, knee: 26 },
};

export function createHipExtensionSignal(config = {}) {
  const MODE = config.mode ?? "nearSide";            // 'nearSide' | 'average'
  const REST_DEFAULT = config.restDefault ?? 125;    // deg, used until/unless a stable rest is measured
  const TARGET = config.targetAngle ?? 170;          // deg = full extension
  const MIN_RANGE = config.minRange ?? 35;           // never let (target - rest) shrink below this
  const MIN_VIS = config.minVisibility ?? 0.3;
  const CAL_FRAMES = config.calFrames ?? 15;         // ~0.5 s at 30 fps
  const CAL_TOL = config.calTolerance ?? 6;          // deg spread allowed while "still"
  const CAL_GIVE_UP = config.calGiveUp ?? 90;        // frames, then fall back to REST_DEFAULT
  const REST_MIN = 90, REST_MAX = 150;              // plausible resting hip angle when lying knees-bent

  let side = "left";
  let rest = REST_DEFAULT;
  let calibrated = false;
  let framesSeen = 0;
  const raw = [];    // last 5 angles (median filter)
  const recent = []; // last CAL_FRAMES filtered angles (calibration window)

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
    const score = (s) => Object.values(CHAIN[s]).reduce((t, i) => t + (landmarks[i].visibility ?? 1), 0);
    // hysteresis: only switch sides when the other is clearly better
    if (side === "left" && score("right") > score("left") + 0.3) side = "right";
    else if (side === "right" && score("left") > score("right") + 0.3) side = "left";
  }

  return {
    /** Returns { valid, angle, ext, side, calibrated, restAngle, targetAngle }. */
    process(landmarks, meta = {}) {
      if (!landmarks || landmarks.length < 27) return { valid: false, calibrated, restAngle: rest };
      if (MODE === "nearSide") chooseSide(landmarks);

      const shoulder = pick(landmarks, "shoulder"), hip = pick(landmarks, "hip"), knee = pick(landmarks, "knee");
      if (!shoulder || !hip || !knee) return { valid: false, calibrated, restAngle: rest };
      const minVis = Math.min(shoulder.visibility ?? 1, hip.visibility ?? 1, knee.visibility ?? 1);
      if (minVis < MIN_VIS) return { valid: false, calibrated, restAngle: rest };

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

      const target = Math.max(TARGET, rest + MIN_RANGE);
      const ext = clamp01((angle - rest) / (target - rest));
      return { valid: true, angle, ext, side, calibrated, restAngle: rest, targetAngle: target };
    },
    /** Let the baseline drift DOWN only (patient relaxes flatter); never up,
     * so holding a half-lift can't quietly raise "rest". */
    relaxRest(angle) {
      if (calibrated && angle < rest - 3 && angle >= REST_MIN) rest = rest * 0.9 + angle * 0.1;
    },
    isCalibrated() { return calibrated; },
    getRest() { return rest; },
    reset() {
      side = "left"; rest = REST_DEFAULT; calibrated = false; framesSeen = 0;
      raw.length = 0; recent.length = 0;
    },
  };
}
