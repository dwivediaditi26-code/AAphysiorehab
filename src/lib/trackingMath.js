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
// nose, shoulders, wrists, hips, knees, ankles.
const FRAMING_LANDMARKS = [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * True when every landmark needed to see the whole body is present and
 * reasonably confident. Use this to pause rep counting and prompt the
 * patient to reposition rather than counting reps off a partial-body frame.
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
