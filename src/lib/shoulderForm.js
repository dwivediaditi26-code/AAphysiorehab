/**
 * Compensation watch for the shoulder raise exercises (Shoulder Flexion and
 * Abduction). Tells the patient when the arm is going up but the movement is
 * being faked from somewhere else — the faults the Physiotutors "Active Range
 * of Motion: Shoulder" video and the exercise's own instructions call out:
 *
 *   shrug  — the shoulder hikes up toward the ear ("relax your shoulder").
 *            Measured as the ear-to-shoulder gap shrinking below SHRUG_RATIO of
 *            its resting value. Only checked while the arm is below ~110 deg:
 *            past that the shoulder blade rotates up as part of normal
 *            scapulohumeral rhythm and a small rise is not a fault.
 *   lean   — the trunk swaying to get the arm up ("don't compensate from the
 *            spine by leaning"). Measured as the shoulder-hip line moving more
 *            than LEAN_DEG from its resting angle from vertical (both sides:
 *            midpoints, so a frontal camera sees side-to-side lean; one side:
 *            that side's shoulder->hip, so a side camera sees lean back).
 *   elbow  — the elbow bending when the arm is meant to stay straight, at the
 *            top of the movement (shoulder-elbow-wrist below ELBOW_MIN).
 *
 * Resting values are an EMA tracked while no rep is in progress, frozen when
 * one starts. A fault must persist FRAMES_NEEDED frames to be flagged, so a
 * single noisy landmark can't flag a rep.
 *
 * Draft thresholds, not validated on real footage. Landmarks with low
 * visibility, or ears below the shoulders (a nonsense geometry), are ignored.
 */
import { angleAtAspect } from "./trackingMath.js";

const RAD = 180 / Math.PI;
const SIDES = {
  left: { ear: 7, shoulder: 11, elbow: 13, wrist: 15, hip: 23 },
  right: { ear: 8, shoulder: 12, elbow: 14, wrist: 16, hip: 24 },
};
const ok = (p, v = 0.5) => !!p && (p.visibility ?? 1) >= v;

export function createShoulderFormWatch(config = {}) {
  const SHRUG_RATIO = config.shrugRatio ?? 0.88;
  const SHRUG_MAX_ARM = config.shrugMaxArm ?? 110;   // deg of arm elevation
  const LEAN_DEG = config.leanDeg ?? 10;
  const ELBOW_MIN = config.elbowMin ?? 150;           // deg
  const ELBOW_AT_EXT = config.elbowAtExt ?? 0.6;      // only judged near the top of the movement
  const FRAMES_NEEDED = config.framesNeeded ?? 4;
  const ALPHA = config.alpha ?? 0.05;

  let neck0 = null, lean0 = null;
  const frames = { shrug: 0, lean: 0, elbow: 0 };

  function neckGap(lm, sides) {
    const gaps = sides.map((s) => SIDES[s]).filter((c) => ok(lm[c.ear]) && ok(lm[c.shoulder]))
      .map((c) => lm[c.shoulder].y - lm[c.ear].y).filter((g) => g > 0.02 && g < 0.5);
    return gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : null;
  }

  function leanDeg(lm, sides, aspect = 1) {
    const cs = sides.map((s) => SIDES[s]).filter((c) => ok(lm[c.shoulder]) && ok(lm[c.hip]));
    if (!cs.length) return null;
    const mid = (key) => ({ x: cs.reduce((a, c) => a + lm[c[key]].x, 0) / cs.length, y: cs.reduce((a, c) => a + lm[c[key]].y, 0) / cs.length });
    const sh = mid("shoulder"), hip = mid("hip");
    if (hip.y - sh.y < 0.05) return null; // torso not upright in frame
    return Math.atan2((sh.x - hip.x) * aspect, hip.y - sh.y) * RAD;
  }

  function elbowAngle(lm, sides, aspect) {
    const angs = sides.map((s) => SIDES[s]).filter((c) => ok(lm[c.shoulder]) && ok(lm[c.elbow]) && ok(lm[c.wrist]))
      .map((c) => angleAtAspect(lm[c.shoulder], lm[c.elbow], lm[c.wrist], aspect));
    return angs.length ? Math.min(...angs) : null;
  }

  return {
    /**
     * @param sides  ['left','right'] (frontal, both arms) or [side] (side view)
     * @param active true while a rep is in progress (baselines freeze)
     * @param armAngle current arm elevation in degrees (hip-shoulder-elbow)
     * @param ext    0..1 progress toward the rep target
     */
    update(lm, { sides, aspect, active, armAngle, ext }) {
      const neck = neckGap(lm, sides);
      const lean = leanDeg(lm, sides, aspect);
      if (!active) {
        if (neck !== null) neck0 = neck0 === null ? neck : neck0 + ALPHA * (neck - neck0);
        if (lean !== null) lean0 = lean0 === null ? lean : lean0 + ALPHA * (lean - lean0);
        return;
      }
      const shrugging = neck !== null && neck0 !== null && armAngle <= SHRUG_MAX_ARM && neck < neck0 * SHRUG_RATIO;
      frames.shrug = shrugging ? frames.shrug + 1 : 0;
      const leaning = lean !== null && lean0 !== null && Math.abs(lean - lean0) > LEAN_DEG;
      frames.lean = leaning ? frames.lean + 1 : 0;
      const elbow = ext >= ELBOW_AT_EXT ? elbowAngle(lm, sides, aspect) : null;
      frames.elbow = elbow !== null && elbow < ELBOW_MIN ? frames.elbow + 1 : 0;
    },
    /** Faults seen so far in the current rep. */
    flags() {
      const out = new Set();
      if (frames.shrug >= FRAMES_NEEDED) out.add("shrug");
      if (frames.lean >= FRAMES_NEEDED) out.add("lean");
      if (frames.elbow >= FRAMES_NEEDED) out.add("elbow");
      return out;
    },
    /** Latch: once a fault has persisted long enough it stays flagged for the rep. */
    latch(into) {
      for (const f of this.flags()) into.add(f);
    },
    startRep() { frames.shrug = frames.lean = frames.elbow = 0; },
    reset() { neck0 = null; lean0 = null; frames.shrug = frames.lean = frames.elbow = 0; },
  };
}
