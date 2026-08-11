/**
 * Side-Lying Leg Raise tracker. Same pattern as deadBugTracker.js.
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

export function createSideLyingLegRaiseTracker(config = {}) {
  const ENTER = config.enter ?? 0.35;
  const EXIT = config.exit ?? 0.18;
  const MIN_PEAK = config.minPeak ?? 0.3;
  const SPEED_FLAG = config.speedFlag ?? 0.1;

  const state = {
    phase: { A: "idle", B: "idle" },
    peak: { A: 0, B: 0 },
    reps: { A: 0, B: 0 },
    lastExt: { A: 0, B: 0 },
    maxDelta: { A: 0, B: 0 },
    baseline: null,
    calibFrames: 0,
    feedbackFlags: new Set(),
  };

  function updatePair(key, ext, otherExt) {
    const delta = Math.abs(ext - state.lastExt[key]);
    state.lastExt[key] = ext;
    if (delta > state.maxDelta[key]) state.maxDelta[key] = delta;

    if (state.phase[key] === "idle" && ext > ENTER) {
      state.phase[key] = "rising";
      state.peak[key] = ext;
      state.maxDelta[key] = 0;
    } else if (state.phase[key] === "rising") {
      if (ext > state.peak[key]) state.peak[key] = ext;
      if (ext < EXIT) {
        if (state.peak[key] >= MIN_PEAK) {
          state.reps[key]++;
          if (state.maxDelta[key] > SPEED_FLAG) state.feedbackFlags.add("speed");
          if (otherExt > 0.25) state.feedbackFlags.add("bottomLegMoving");
        }
        state.phase[key] = "idle";
        state.peak[key] = 0;
      }
    }
  }

  return {
    processFrame(landmarks) {
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
      updatePair("A", extA, extB);
      updatePair("B", extB, extA);

      state.baseline.left = state.baseline.left * 0.99 + leftAnkleY * 0.01;
      state.baseline.right = state.baseline.right * 0.99 + rightAnkleY * 0.01;

      return state;
    },
    getRepCount() { return state.reps.A + state.reps.B; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("bottomLegMoving")) out.push(M.keepBottomLegStill);
      if (out.length === 0) out.push(M.goodLegRaise);
      return out;
    },
    reset() {
      state.phase = { A: "idle", B: "idle" };
      state.peak = { A: 0, B: 0 };
      state.reps = { A: 0, B: 0 };
      state.lastExt = { A: 0, B: 0 };
      state.maxDelta = { A: 0, B: 0 };
      state.baseline = null;
      state.calibFrames = 0;
      state.feedbackFlags = new Set();
    },
  };
}
