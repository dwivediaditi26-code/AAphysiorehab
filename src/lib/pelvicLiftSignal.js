/**
 * Pelvic-lift signal for bridging when the head and shoulders are NOT in
 * frame — the usual phone setup (phone close, or held portrait), where the
 * shoulder-hip-knee angle used by hipExtensionSignal.js can't be measured.
 *
 * Uses only the pelvis and thigh: how far the near-side hip has risen above
 * where it rested, in units of the patient's own thigh length (hip-to-knee
 * distance, aspect-corrected). Thigh lengths make it independent of how far
 * the phone is and of portrait vs landscape.
 *
 * Candidates that need no shoulder, measured on the real side-view bridge
 * clip (MediaPipe Full, rest -> full lift):
 *   pelvis rise / thigh length   range 0.35   rest noise 0.007   <- used
 *   pelvis vs knee               range 0.32   rest noise 0.007
 *   pelvis vs ankle              range 0.36   rest noise 0.033   (the ankle wobbles with foot roll)
 * The full bridge in that clip lifted the pelvis 0.35 thigh lengths, so
 * TARGET = 0.35 is "1.0". That is ONE person on ONE clip: geometry says the
 * true full-lift rise runs ~0.3-0.45 thigh lengths depending on foot placement
 * and torso length, so treat the target (and every cue built on it) as a
 * DRAFT until validated on real patients' footage.
 *
 * Same contract as hipExtensionSignal.js — 0 = resting, 1 = full lift; a
 * per-patient rest baseline measured while the patient is still; median
 * filter; low-confidence frames reported invalid so a bad frame can never
 * invent or cancel a rep.
 *
 * Pure JS, no dependencies.
 */
import { clamp01, median } from "./trackingMath.js";

const CHAIN = {
  left: { hip: 23, knee: 25, ankle: 27 },
  right: { hip: 24, knee: 26, ankle: 28 },
};

export function createPelvicLiftSignal(config = {}) {
  const MODE = config.mode ?? "nearSide";        // 'nearSide' | 'average' (Single Leg Bridge: both legs, visibility-weighted)
  const TARGET = config.target ?? 0.35;          // pelvis rise, in thigh lengths, that counts as a full bridge
  const MIN_VIS = config.minVisibility ?? 0.3;
  const MIN_LEN = config.minThighLen ?? 0.04;    // image-height units; shorter than this the "thigh" is a dot
  const CAL_FRAMES = config.calFrames ?? 15;     // ~0.5 s at 30 fps
  const CAL_TOL = config.calTolerance ?? 0.05;   // thigh lengths of pelvis wobble allowed while "still"
  const CAL_GIVE_UP = config.calGiveUp ?? 90;    // frames, then take the lowest recent pelvis as rest

  let side = "left";
  let calibrated = false;
  let framesSeen = 0;
  let restY = null;    // pelvis y at rest (image units; larger = lower in the picture)
  let len0 = null;     // thigh length at rest
  let lowestY = null;  // lowest pelvis seen so far — the provisional rest until calibrated
  let lastY = null;
  const ys = [];       // last 5 pelvis y (median filter)
  const recent = [];   // last CAL_FRAMES { y, len } (calibration window)

  const visOf = (p) => (p ? p.visibility ?? 1 : 0);

  function pick(landmarks, joint) {
    if (MODE === "nearSide") return landmarks[CHAIN[side][joint]];
    const a = landmarks[CHAIN.left[joint]], b = landmarks[CHAIN.right[joint]];
    if (!a || !b) return a || b || null;
    const va = visOf(a), vb = visOf(b), w = va + vb;
    if (w < MIN_VIS) return null;
    return { x: (a.x * va + b.x * vb) / w, y: (a.y * va + b.y * vb) / w, visibility: Math.max(va, vb) };
  }

  function chooseSide(landmarks) {
    const score = (s) => Object.values(CHAIN[s]).reduce((t, i) => t + visOf(landmarks[i]), 0);
    // hysteresis: only switch sides when the other is clearly better
    if (side === "left" && score("right") > score("left") + 0.3) side = "right";
    else if (side === "right" && score("left") > score("right") + 0.3) side = "left";
  }

  return {
    /** Returns { valid, raw, ext, side, calibrated }. raw = pelvis rise in thigh lengths. */
    process(landmarks, meta = {}) {
      const invalid = { valid: false, calibrated };
      if (!landmarks || landmarks.length < 27) return invalid;
      if (MODE === "nearSide") chooseSide(landmarks);

      const hip = pick(landmarks, "hip"), knee = pick(landmarks, "knee");
      if (!hip || !knee) return invalid;
      if (Math.min(visOf(hip), visOf(knee)) < MIN_VIS) return invalid;

      const a = meta.aspect && isFinite(meta.aspect) ? meta.aspect : 1;
      const len = Math.hypot((knee.x - hip.x) * a, knee.y - hip.y);
      if (len < MIN_LEN) return invalid;

      ys.push(hip.y);
      if (ys.length > 5) ys.shift();
      const y = median(ys);
      lastY = y;
      framesSeen++;

      // --- per-patient rest baseline ---
      recent.push({ y, len });
      if (recent.length > CAL_FRAMES) recent.shift();
      if (!calibrated) {
        lowestY = lowestY === null ? y : Math.max(lowestY, y);
        if (recent.length === CAL_FRAMES) {
          const l0 = median(recent.map((r) => r.len));
          const yy = recent.map((r) => r.y);
          if ((Math.max(...yy) - Math.min(...yy)) / l0 < CAL_TOL) { restY = median(yy); len0 = l0; calibrated = true; }
        }
        if (!calibrated && framesSeen >= CAL_GIVE_UP) { // never held still: the lowest recent pelvis is our best guess at rest
          restY = Math.max(...recent.map((r) => r.y));
          len0 = median(recent.map((r) => r.len));
          calibrated = true;
        }
      }

      const base = restY ?? lowestY, scale = len0 ?? len;
      const raw = (base - y) / scale;
      return { valid: true, raw, ext: clamp01(raw / TARGET), side, calibrated };
    },
    /** Let the baseline drift DOWN only (patient relaxes flatter); never up,
     * so holding a half-lift can't quietly raise "rest". Call when not mid-rep. */
    relaxRest() {
      if (!calibrated || lastY === null) return;
      if (lastY > restY + 0.03 * len0 && lastY < restY + 0.25 * len0) restY = restY * 0.9 + lastY * 0.1;
    },
    isCalibrated() { return calibrated; },
    getRest() { return restY; },
    reset() {
      side = "left"; calibrated = false; framesSeen = 0;
      restY = null; len0 = null; lowestY = null; lastY = null;
      ys.length = 0; recent.length = 0;
    },
  };
}
