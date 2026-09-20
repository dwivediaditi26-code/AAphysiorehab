/**
 * Landmark smoother + glitch guard. Sits between MediaPipe and every
 * tracker so raw per-frame pose noise never reaches the rep logic.
 *
 * Two problems it solves (both measured on a real side-view bridge clip):
 *   1. Jitter — raw landmarks wobble a few pixels frame to frame. A One Euro
 *      filter removes it without adding lag while you actually move: it
 *      smooths hard when the joint is still (low cutoff) and opens up as
 *      speed rises (beta term).
 *   2. Hallucinated joints — a hidden/occluded joint (far-side knee behind
 *      the near leg, a wrist under the body) gets a low `visibility` and a
 *      made-up position that can teleport. Below HOLD_VISIBILITY we FREEZE
 *      the joint at its last good position instead of trusting the guess,
 *      and a single-frame jump larger than MAX_JUMP on a not-confident
 *      landmark is rejected (held) for a few frames before we accept it, so
 *      a genuine fast move still recovers.
 *
 * Pure JS, no dependencies, safe to unit-test in node.
 */

const DEFAULTS = {
  minCutoff: 1.2,      // Hz — smoothing when still. Lower = smoother, more lag.
  beta: 8,             // speed coefficient (normalized units/sec). Higher = less lag on fast moves.
  dCutoff: 1.0,        // Hz — derivative smoothing
  holdVisibility: 0.3, // below this, freeze at last good position
  maxJump: 0.15,       // normalized units in one frame; bigger + low confidence = glitch
  jumpTrustVisibility: 0.8, // a jump on a landmark at/above this visibility is believed
  maxGlitchFrames: 5,  // hold a glitching joint at most this many frames, then accept
  resetGapMs: 500,     // no frames for this long -> person left/re-entered, restart filters
};

function alpha(cutoff, dtSec) {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dtSec);
}

class OneEuro {
  constructor(cfg) { this.cfg = cfg; this.reset(); }
  reset() { this.x = null; this.dx = 0; }
  seed(v) { this.x = v; this.dx = 0; }
  filter(v, dtSec) {
    if (this.x === null) { this.x = v; return v; }
    const { minCutoff, beta, dCutoff } = this.cfg;
    const rawDx = (v - this.x) / dtSec;
    this.dx += alpha(dCutoff, dtSec) * (rawDx - this.dx);
    const cutoff = minCutoff + beta * Math.abs(this.dx);
    this.x += alpha(cutoff, dtSec) * (v - this.x);
    return this.x;
  }
}

export function createLandmarkSmoother(config = {}) {
  const cfg = { ...DEFAULTS, ...config };
  let lastT = null;
  let joints = []; // per landmark index: { fx, fy, out:{x,y}|null, glitchRun }

  function ensure(i) {
    if (!joints[i]) joints[i] = { fx: new OneEuro(cfg), fy: new OneEuro(cfg), out: null, glitchRun: 0 };
    return joints[i];
  }

  return {
    /** landmarks: raw MediaPipe array (or null). now: ms. Returns a NEW array of
     * { x, y, z, visibility } (same length) or null when there is no pose. */
    smooth(landmarks, now = Date.now()) {
      if (!landmarks) return null;
      if (lastT !== null && now - lastT > cfg.resetGapMs) { joints = []; }
      const dt = lastT === null ? 1 / 30 : Math.max((now - lastT) / 1000, 1 / 240);
      lastT = now;

      return landmarks.map((p, i) => {
        const j = ensure(i);
        const vis = p.visibility ?? 1;
        const z = p.z ?? 0;

        // 1) Not confident at all: don't believe the position — freeze.
        if (vis < cfg.holdVisibility && j.out) {
          return { x: j.out.x, y: j.out.y, z, visibility: vis };
        }

        // 2) Confident-ish landmark that suddenly teleports: treat as a glitch.
        if (j.out && vis < cfg.jumpTrustVisibility) {
          const jump = Math.hypot(p.x - j.out.x, p.y - j.out.y);
          if (jump > cfg.maxJump && j.glitchRun < cfg.maxGlitchFrames) {
            j.glitchRun++;
            return { x: j.out.x, y: j.out.y, z, visibility: vis };
          }
        }
        j.glitchRun = 0;

        // 3) Normal path: One Euro smoothing.
        const x = j.fx.filter(p.x, dt);
        const y = j.fy.filter(p.y, dt);
        j.out = { x, y };
        return { x, y, z, visibility: vis };
      });
    },
    reset() { lastT = null; joints = []; },
  };
}
