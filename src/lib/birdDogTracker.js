/**
 * Bird Dog tracker. Same pattern as deadBugTracker.js — Bird Dog is
 * biomechanically close to Dead Bug (opposite arm + leg extend together),
 * so this reuses the same two-side structure, built on the shared debounced
 * rep counter (repCounter.js).
 *
 * Assumes a side-on camera view, patient on hands and knees. Signal: how
 * far the wrist has reached from the shoulder plus how far the ankle has
 * reached from the hip, normalized by torso length (distance-based, since
 * Bird Dog's reach is mostly horizontal rather than vertical like Dead Bug).
 *
 * Heuristic thresholds, not clinically validated — tune against real
 * footage. Coaching feedback, not a diagnostic tool.
 */
import { norm, dist } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createBirdDogTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.09;
  const TRUNK_FLAG = config.trunkFlag ?? 0.05;
  const counterOpts = { enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 };

  const counters = { A: createRepCounter(counterOpts), B: createRepCounter(counterOpts) };
  const state = {
    lastExt: { A: 0, B: 0 },
    maxDelta: { A: 0, B: 0 },
    baselineHipY: null,
    calibFrames: 0,
    feedbackFlags: new Set(),
  };

  function extensionFor(wrist, shoulder, ankle, hip, torsoLen) {
    const armReach = norm(dist(wrist, shoulder), 0, torsoLen * 0.9);
    const legReach = norm(dist(ankle, hip), 0, torsoLen * 0.9);
    return (armReach + legReach) / 2;
  }

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
      if (otherExt > 0.25) state.feedbackFlags.add("isolation");
    }

    if (!wasActive && counters[key].isActive()) {
      state.feedbackFlags = new Set();
      state.maxDelta[key] = 0;
    }
  }

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12], LW = landmarks[15], RW = landmarks[16];
      const LH = landmarks[23], RH = landmarks[24], LA = landmarks[27], RA = landmarks[28];
      const hipY = (LH.y + RH.y) / 2;
      const shoulderY = (LS.y + RS.y) / 2;
      const torsoLen = Math.max(0.05, Math.abs(hipY - shoulderY));

      if (state.baselineHipY === null) {
        state.calibFrames++;
        state.baselineHipY = hipY;
        if (state.calibFrames < 10) return state;
      }

      const extA = extensionFor(LW, LS, RA, RH, torsoLen); // left arm + right leg
      const extB = extensionFor(RW, RS, LA, LH, torsoLen); // right arm + left leg
      updateSide("A", extA, extB, now);
      updateSide("B", extB, extA, now);

      const hipShift = Math.abs(state.baselineHipY - hipY);
      if ((counters.A.isActive() || counters.B.isActive()) && hipShift > TRUNK_FLAG) {
        state.feedbackFlags.add("trunk");
      }
      state.baselineHipY = state.baselineHipY * 0.98 + hipY * 0.02;

      return state;
    },
    getRepCount() { return counters.A.getRepCount() + counters.B.getRepCount(); },
    getExtension() { return { A: state.lastExt.A, B: state.lastExt.B }; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerReps);
      if (state.feedbackFlags.has("trunk")) out.push(M.noRocking);
      if (state.feedbackFlags.has("isolation")) out.push(M.keepRestingStill);
      if (out.length === 0) out.push(M.goodFormGeneric);
      return out;
    },
    reset() {
      counters.A.reset(); counters.B.reset();
      state.lastExt = { A: 0, B: 0 };
      state.maxDelta = { A: 0, B: 0 };
      state.baselineHipY = null;
      state.calibFrames = 0;
      state.feedbackFlags = new Set();
    },
  };
}
