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

/**
 * Aspect-corrected angle at vertex b. MediaPipe landmarks are normalized
 * PER AXIS (x by image width, y by image height), so on a 16:9 frame one
 * unit of x is ~1.8x longer than one unit of y and plain angleAt() bends
 * every angle (a true 90 degree joint can read 70-110). Multiplying x by
 * width/height puts both axes in the same unit before measuring.
 * `aspect` = videoWidth / videoHeight; falls back to angleAt() when absent.
 */
export function angleAtAspect(a, b, c, aspect) {
  if (!aspect || !isFinite(aspect)) return angleAt(a, b, c);
  const s = (p) => ({ x: p.x * aspect, y: p.y });
  return angleAt(s(a), s(b), s(c));
}

/** Median of a numeric array (does not mutate). */
export function median(values) {
  if (!values.length) return 0;
  const v = [...values].sort((x, y) => x - y);
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

// Landmarks that should all be visible for a useful side-on, whole-body shot:
// nose, shoulders, wrists, hips, knees, ankles. Used only for the "reposition
// yourself" nudge — NOT as a hard gate on tracking itself (see hasMinimalPose
// below for that). Requiring all 11 of these simultaneously turned out to be
// too strict for real camera setups (a laptop webcam at desk height rarely
// sees feet at all) and was silently blocking rep counting entirely.
const FRAMING_LANDMARKS = [0, 11, 12, 15, 16, 23, 24, 25, 26, 27, 28];

/**
 * @deprecated Do not use for the "move back" nudge. It demands visibility
 * >= 0.5 on BOTH sides plus wrists, but in any side-on view the far-side
 * knee/ankle/wrist are occluded and score < 0.5 even in a perfectly framed
 * shot, so it reported "move back" on 100% of frames of a real clip. Use
 * assessFraming() in poseQuality.js (checks the near-side chain is inside
 * the frame). Kept only so old imports don't break.
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

// Shoulder + hip on AT LEAST ONE side. Lying side-on (or any side view) the
// far shoulder/hip are often hidden behind the body, and requiring both
// sides made tracking flicker to "can't see you" for no real reason.
// Low bar on purpose: every tracker's signal is computed from these torso
// points; finer per-exercise gating happens in the tracker itself.
const SIDE_TORSO = [[11, 23], [12, 24]];

export function hasMinimalPose(landmarks, threshold = 0.3) {
  if (!landmarks) return false;
  return SIDE_TORSO.some((pair) =>
    pair.every((i) => {
      const p = landmarks[i];
      return !!p && (p.visibility ?? 1) >= threshold;
    })
  );
}
