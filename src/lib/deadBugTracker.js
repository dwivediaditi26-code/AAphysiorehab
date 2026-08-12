/**
 * Dead Bug tracker.
 *
 * Pattern: exercise -> required landmarks -> phase state machine -> rep count -> form checks.
 * Uses the shared, debounced createRepCounter (repCounter.js) for the actual
 * phase/counting logic — see that file for why: single-frame threshold
 * crossings double-count on real camera jitter.
 *
 * Assumes a side-on camera view: phone propped at roughly hip height, patient's profile
 * silhouette in frame, lying supine. Feed it PoseLandmarker's `landmarks[0]` array
 * (33 normalized points) every frame via processFrame().
 *
 * Thresholds below are a reasonable starting point, not clinically validated —
 * calibrate against real footage (different bodies, camera angles, mat colors) before
 * relying on them, and keep this framed as movement-quality coaching feedback, not a
 * diagnostic claim.
 *
 * BlazePose landmark indices used: 11/12 shoulders, 15/16 wrists, 23/24 hips, 27/28 ankles.
 */
import { createRepCounter } from "./repCounter.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createDeadBugTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.09;
  const TRUNK_FLAG = config.trunkFlag ?? 0.05;
  const counterOpts = { enter: config.enter ?? 0.32, exit: config.exit ?? 0.16, minPeak: config.minPeak ?? 0.28 };

  const counters = { A: createRepCounter(counterOpts), B: createRepCounter(counterOpts) };
  const state = {
    lastExt: { A: 0, B: 0 },
    maxDelta: { A: 0, B: 0 },
    baselineHipY: null,
    calibFrames: 0,
    feedbackFlags: new Set(),
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const norm = (v, lo, hi) => clamp01((v - lo) / ((hi - lo) || 1));

  function extensionFor(wrist, shoulder, ankle, hip, hipY, torsoLen) {
    const armLower = norm(wrist.y, shoulder.y, hipY);
    const legLower = norm(ankle.y - hip.y, 0, torsoLen * 0.9);
    return (armLower + legLower) / 2;
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
      const torsoLen = Math.max(0.05, hipY - shoulderY);

      if (state.baselineHipY === null) {
        state.calibFrames++;
        state.baselineHipY = hipY;
        if (state.calibFrames < 10) return state;
      }

      const extA = extensionFor(LW, LS, RA, RH, hipY, torsoLen); // left arm + right leg
      const extB = extensionFor(RW, RS, LA, LH, hipY, torsoLen); // right arm + left leg
      updateSide("A", extA, extB, now);
      updateSide("B", extB, extA, now);

      const hipRise = state.baselineHipY - hipY;
      if ((counters.A.isActive() || counters.B.isActive()) && hipRise > TRUNK_FLAG) {
        state.feedbackFlags.add("trunk");
      }
      state.baselineHipY = state.baselineHipY * 0.98 + hipY * 0.02;

      return state;
    },
    getRepCount() { return counters.A.getRepCount() + counters.B.getRepCount(); },
    getPhase() { return counters.A.isActive() ? "A" : counters.B.isActive() ? "B" : "idle"; },
    getExtension() { return { A: state.lastExt.A, B: state.lastExt.B }; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerReps);
      if (state.feedbackFlags.has("trunk")) out.push(M.lowerBackDown);
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
