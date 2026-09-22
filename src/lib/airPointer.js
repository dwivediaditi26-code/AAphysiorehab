/**
 * "Point at a button and hold" hands-free control for the live tracking
 * screens — for when the phone is propped up out of reach, which is most
 * floor exercises. Two independent, pure, unit-tested pieces:
 *
 *   findPointingHand()   raw landmarks -> is a hand "pointing", and where
 *   createDwellSelector()  a stream of screen points + button zones ->
 *                          hover/dwell progress, and an activate event once
 *                          a zone has been held long enough
 *
 * Coordinate mapping from a landmark to an actual screen pixel (mirrored,
 * object-cover) is separate — see screenMapping.js — so this file has no DOM
 * dependency and can be tested with plain numbers.
 */

/**
 * Decide whether either wrist qualifies as "pointing at the screen" this
 * frame, and return its normalized (0..1, unmirrored camera-space) position
 * if so, else null.
 *
 * Deliberately a HIGH bar — the wrist must be above the NOSE, not just the
 * shoulder. That's well outside the range of motion of every exercise this
 * app currently tracks: none of the lying-down work (bridging, dead bug,
 * bird dog, side-lying leg raise) raises a hand near the head, and the
 * standing frontal work (shoulder/hip abduction) tops out around shoulder
 * height. This is what keeps a genuine rep from being misread as a gesture.
 * A draft threshold — validate against real footage of standing exercises
 * with a larger overhead range before relying on it there.
 */
export function findPointingHand(landmarks, { minVisibility = 0.5 } = {}) {
  if (!landmarks || landmarks.length < 17) return null;
  const nose = landmarks[0];
  if (!nose || (nose.visibility ?? 1) < minVisibility) return null;

  const candidates = [landmarks[15], landmarks[16]].filter(
    (wrist) => wrist && (wrist.visibility ?? 1) >= minVisibility && wrist.y < nose.y
  );
  if (candidates.length === 0) return null;
  // Prefer whichever is raised higher — the more clearly deliberate reach.
  candidates.sort((a, b) => a.y - b.y);
  return { x: candidates[0].x, y: candidates[0].y };
}

/**
 * Dwell-to-activate zone selector. Call update() once per frame with the
 * current screen-space point (or null — no pointing hand this frame) and the
 * zone rectangles (in that same coordinate space); it tracks how long the
 * point has sat CONTINUOUSLY inside one zone and fires once dwell reaches
 * HOLD_MS. A zone must be left (point moves off it, to another zone or to
 * nothing) before it can activate again, so a lingering hand can't fire the
 * same button repeatedly — but moving straight from one zone to another
 * starts a fresh dwell on the new one immediately.
 */
export function createDwellSelector(config = {}) {
  const HOLD_MS = config.holdMs ?? 900;

  let zoneId = null, since = null;
  let justActivatedZoneId = null; // must be left before it can activate again

  const pointIn = (p, z) => p.x >= z.x0 && p.x <= z.x1 && p.y >= z.y0 && p.y <= z.y1;

  return {
    /** point: {x,y} in the same units as each zone's {id,x0,y0,x1,y1}, or null.
     * Returns { overZoneId, progress (0-1), activatedZoneId (or null) }. */
    update(point, zones, now = Date.now()) {
      const hit = point ? zones.find((z) => pointIn(point, z)) : null;
      const hitId = hit ? hit.id : null;

      if (hitId !== zoneId) { zoneId = hitId; since = hitId === null ? null : now; }
      if (hitId !== justActivatedZoneId) justActivatedZoneId = null; // left it -> re-armed

      if (zoneId === null) return { overZoneId: null, progress: 0, activatedZoneId: null };

      const progress = Math.min(1, (now - since) / HOLD_MS);
      let activatedZoneId = null;
      if (zoneId !== justActivatedZoneId && now - since >= HOLD_MS) {
        activatedZoneId = zoneId;
        justActivatedZoneId = zoneId;
      }
      return { overZoneId: zoneId, progress, activatedZoneId };
    },
    reset() { zoneId = null; since = null; justActivatedZoneId = null; },
  };
}
