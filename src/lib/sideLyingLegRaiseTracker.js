/**
 * Side-Lying Leg Raise tracker. Same pattern as deadBugTracker.js, built on
 * the shared debounced rep counter (repCounter.js) — one instance per side.
 * Assumes side-lying on the mat, side-on camera — same physical camera
 * placement as the other floor exercises (to the side of the mat). An
 * upright, untilted camera reads real-world "up" as image "up" regardless
 * of which way the patient is lying, so this works with the same setup as
 * Dead Bug/Glute Bridge without needing a different camera position.
 * Doesn't assume which side they're lying on — tracks both ankles against
 * their own calibrated baseline (same idea as hipAbductionTracker.js) and
 * whichever one lifts is "the" side for that rep.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createSideLyingLegRaiseTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const counterOpts = { enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 };

  const counters = { A: createRepCounter(counterOpts), B: createRepCounter(counterOpts) };
  const state = {
    lastExt: { A: 0, B: 0 },
    maxDelta: { A: 0, B: 0 },
    baseline: null,
    calibFrames: 0,
    feedbackFlags: new Set(),
  };

  function updateSide(key, ext, otherExt, now) {
    const wasActive = counters[key].isActive();
    if (wasActive) {
      const delta = Math.abs(ext - state.lastExt[key]);
      if (delta > state.maxDelta[key]) state.maxDelta[key] = delta;
    }
    state.lastExt[key] = ext;

    const completed = counters[key].update(ext, now);
    if (completed) {
      if (state.maxDelta[key] > SPEED_FLAG) state.feedbackFlags.add("speed");
      if (otherExt > 0.25) state.feedbackFlags.add("bottomLegMoving");
    }

    if (!wasActive && counters[key].isActive()) {
      state.feedbackFlags = new Set();
      state.maxDelta[key] = 0;
    }
  }

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LH = landmarks[23], RH = landmarks[24];
      const LA = landmarks[27], RA = landmarks[28];
      const hipY = (LH.y + RH.y) / 2;
      const leftAnkleY = LA.y, rightAnkleY = RA.y;

      if (state.baseline === null) {
        state.calibFrames++;
        state.baseline = { left: leftAnkleY, right: rightAnkleY, hipY };
        if (state.calibFrames < 10) return state;
      }

      const scale = Math.max(0.05, Math.abs(state.baseline.hipY - hipY) || 0.2);
      const extA = norm(state.baseline.left - leftAnkleY, 0, scale * 1.5);
      const extB = norm(state.baseline.right - rightAnkleY, 0, scale * 1.5);
      updateSide("A", extA, extB, now);
      updateSide("B", extB, extA, now);

      state.baseline.left = state.baseline.left * 0.99 + leftAnkleY * 0.01;
      state.baseline.right = state.baseline.right * 0.99 + rightAnkleY * 0.01;

      return state;
    },
    getRepCount() { return counters.A.getRepCount() + counters.B.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("bottomLegMoving")) out.push(M.keepBottomLegStill);
      if (out.length === 0) out.push(M.goodLegRaise);
      return out;
    },
    reset() {
      counters.A.reset(); counters.B.reset();
      state.lastExt = { A: 0, B: 0 };
      state.maxDelta = { A: 0, B: 0 };
      state.baseline = null;
      state.calibFrames = 0;
      state.feedbackFlags = new Set();
    },
  };
}
