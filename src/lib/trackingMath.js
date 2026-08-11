// Shared pure-math helpers for exercise trackers. No exercise-specific logic here —
// see deadBugTracker.js / gluteBridgeTracker.js / birdDogTracker.js / singleLegBridgeTracker.js
// for the actual phase-state-machines that use these.

export function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

export function norm(v, lo, hi) {
  return clamp01((v - lo) / ((hi - lo) || 1));
}

export function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Angle at vertex b, in degrees, formed by points a-b-c. */
export function angleAt(a, b, c) {
  const abx = a.x - b.x, aby = a.y - b.y;
  const cbx = c.x - b.x, cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const magA = Math.hypot(abx, aby), magC = Math.hypot(cbx, cby);
  if (magA === 0 || magC === 0) return 0;
  const cosA = Math.min(1, Math.max(-1, dot / (magA * magC)));
  return (Math.acos(cosA) * 180) / Math.PI;
}

// Landmarks that should all be visible for a useful side-on, whole-body shot:
// nose, shoulders, wrists, hips, knees, ankles. Used only for the "reposition
// yourself" nudge — NOT as a hard gate on tracking itself (see hasMinimalPose
// below for that). Requiring all 11 of these simultaneously turned out to be
// too strict for real camera setups (a laptop webcam at desk height rarely
// sees feet at all) and was silently blocking rep counting entirely.
const FRAMING_LANDMARKS = [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * True when every landmark needed to see the whole body is present and
 * reasonably confident. Drives the on-screen/voice "move back" nudge —
 * informational, not a blocker.
 */
export function isWholeBodyInFrame(landmarks, threshold = 0.5) {
  if (!landmarks) return false;
  return FRAMING_LANDMARKS.every((i) => {
    const p = landmarks[i];
    if (!p) return false;
    const visibility = p.visibility ?? 1;
    return visibility >= threshold;
  });
}

// Shoulders + hips only — the torso, which is visible in nearly any camera
// setup where a person is roughly in frame at all. This is the actual gate
// on whether tracking runs: low bar on purpose, since every tracker's signal
// is computed from angles/distances involving these points regardless of
// whether hands or feet happen to be in frame at a given instant.
const MINIMAL_LANDMARKS = [11, 12, 23, 24];

export function hasMinimalPose(landmarks, threshold = 0.3) {
  if (!landmarks) return false;
  return MINIMAL_LANDMARKS.every((i) => {
    const p = landmarks[i];
    if (!p) return false;
    const visibility = p.visibility ?? 1;
    return visibility >= threshold;
  });
}
