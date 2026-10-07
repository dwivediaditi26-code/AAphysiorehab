/**
 * Head / neck angles from MediaPipe pose landmarks (nose 0, ears 7/8,
 * shoulders 11/12). Pure functions, no state, so the exact numbers the neck
 * trackers act on can be tested in node.
 *
 * Which camera sees what (a 2D image can't see every plane):
 *   frontal camera -> rotation (turning) and side bend (ear toward shoulder)
 *   side camera    -> chin tuck (head sliding back) and nodding (pitch)
 *
 * Every angle is aspect-corrected (x scaled by width/height) — see
 * angleAtAspect() in trackingMath.js — and the trackers use CHANGE FROM THE
 * PATIENT'S OWN RESTING VALUE, not absolute numbers, because resting head
 * position varies a lot between people (forward-head posture is common) and
 * a 2D estimate of an absolute head angle is not goniometer-grade.
 *
 * The anchor numbers used here come from a study of two physiotherapy
 * demonstration videos plus standard cervical ROM norms; see the README
 * section "Neck and shoulder form rules". They are drafts, not validated on
 * real patient footage.
 */
import { median } from "./trackingMath.js";

const RAD = 180 / Math.PI;
const vis = (p) => (p ? p.visibility ?? 1 : 0);

/** Distance from the neck's rotation axis to the nose tip, as a fraction of
 * shoulder width (~11 cm nose reach over ~38 cm shoulder-to-shoulder). */
export const NOSE_REACH = 0.3;

const wrap180 = (d) => { while (d > 180) d -= 360; while (d <= -180) d += 360; return d; };

// Angle of the line q -> p in image space (y points down), degrees.
const lineAngle = (p, q, aspect) => Math.atan2(p.y - q.y, (p.x - q.x) * aspect) * RAD;

/** FRONTAL. Head roll relative to the trunk: the ear line minus the shoulder
 * line, degrees, signed. 0 = ears and shoulders parallel. Using the shoulder
 * line as the reference means a leaning body or a tilted phone cancels out. */
export function headRollDeg(lm, aspect = 1) {
  return wrap180(lineAngle(lm[7], lm[8], aspect) - lineAngle(lm[11], lm[12], aspect));
}

/** FRONTAL. Tilt of the shoulder line from horizontal, degrees, signed.
 * A shoulder hiked toward the ear shows up as a change in this value. */
export function shoulderTiltDeg(lm, aspect = 1) {
  return wrap180(lineAngle(lm[11], lm[12], aspect));
}

/** FRONTAL. Shoulder-to-shoulder width in image-height units. */
export function shoulderWidth(lm, aspect = 1) {
  return Math.abs(lm[11].x - lm[12].x) * aspect;
}

/**
 * FRONTAL. Nose position across the head, as a fraction of shoulder width
 * (signed: + = nose toward larger image x). This is sin(yaw) * NOSE_REACH, so
 * `yawFromOffset` turns it into degrees once the resting value is removed.
 * Reference point is the ear midpoint (immune to the head sliding or tilting
 * as a whole) when both ears are seen; when the far ear is hidden — which is
 * itself what a big turn looks like — fall back to the shoulder midpoint.
 */
export function noseOffsetRatio(lm) {
  const w = Math.abs(lm[11].x - lm[12].x);
  if (w < 1e-6) return null;
  const bothEars = vis(lm[7]) >= 0.5 && vis(lm[8]) >= 0.5;
  const refX = bothEars ? (lm[7].x + lm[8].x) / 2 : (lm[11].x + lm[12].x) / 2;
  return (lm[0].x - refX) / w;
}

/** Degrees of head yaw for a nose offset ratio relative to resting (`rest`). */
export function yawFromOffset(ratio, rest = 0) {
  const s = Math.max(-1, Math.min(1, (ratio - rest) / NOSE_REACH));
  return Math.asin(s) * RAD;
}

/** SIDE. Which way the face points: +1 = toward larger image x, -1 = smaller.
 * Uses the NEAR-side ear only: from a side camera the far ear is hidden and the
 * model guesses where it is, so letting it vote could flip the answer. */
export function faceDirection(nose, nearEar, fallback = 1) {
  const dx = nose.x - nearEar.x;
  return Math.abs(dx) < 0.003 ? fallback : Math.sign(dx);
}

/** SIDE. Forward-head angle: how far the ear sits in FRONT of the shoulder,
 * as an angle from vertical (0 = ear stacked directly over the shoulder,
 * larger = more forward head). Signed so "forward" is always positive
 * whichever way the face points. This is the complement of the craniovertebral
 * angle (CVA ~ 90 - this, using the shoulder in place of C7). */
export function forwardHeadDeg(ear, shoulder, dir, aspect = 1) {
  return Math.atan2(dir * (ear.x - shoulder.x) * aspect, shoulder.y - ear.y) * RAD;
}

/** SIDE. Head pitch: angle of the ear->nose line below horizontal, degrees
 * (+ = nose lower than the ear = looking down). Compared against the resting
 * value, so the ear/nose landmark offset from a true anatomical plane cancels. */
export function headPitchDeg(ear, nose, aspect = 1) {
  return Math.atan2(nose.y - ear.y, Math.abs(nose.x - ear.x) * aspect) * RAD;
}

/**
 * Per-patient resting value: the median of the first `frames` consecutive
 * samples that stay within `tol` of each other (the patient sitting still).
 * If they never settle, after `giveUp` samples take the median of the most
 * recent ones rather than waiting forever. Calibrates once.
 */
export function createStillBaseline({ frames = 15, tol = 3, giveUp = 90 } = {}) {
  const recent = [];
  let seen = 0, value = 0, calibrated = false;
  return {
    update(v) {
      if (calibrated || !isFinite(v)) return calibrated;
      seen++;
      recent.push(v);
      if (recent.length > frames) recent.shift();
      const settled = recent.length === frames && Math.max(...recent) - Math.min(...recent) <= tol;
      if (settled || seen >= giveUp) { value = median(recent); calibrated = true; }
      return calibrated;
    },
    isCalibrated() { return calibrated; },
    value() { return value; },
    reset() { recent.length = 0; seen = 0; value = 0; calibrated = false; },
  };
}
