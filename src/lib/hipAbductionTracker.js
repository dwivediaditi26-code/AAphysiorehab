/**
 * Standing Hip Abduction tracker. Same pattern as deadBugTracker.js.
 * Assumes FRONTAL camera, standing — one leg lifts out to the side while the
 * other stays planted. Frontal-plane movement, so this only became a viable
 * candidate once the camera setup moved from side-view to frontal.
 * Signal: how far each ankle has moved sideways from a calibrated standing
 * baseline (feet start roughly hip-width apart, not at zero offset — hence
 * the baseline calibration, same idea as deadBugTracker's hip baseline),
 * normalized by leg length. Tracked as two independent sides (A/B), like
 * Bird Dog, since only one leg abducts at a time.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm, dist } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createHipAbductionTracker(config = {}) {
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
      state.phase[key] = "raising";
      state.peak[key] = ext;
      state.maxDelta[key] = 0;
    } else if (state.phase[key] === "raising") {
      if (ext > state.peak[key]) state.peak[key] = ext;
      if (ext < EXIT) {
        if (state.peak[key] >= MIN_PEAK) {
          state.reps[key]++;
          if (state.maxDelta[key] > SPEED_FLAG) state.feedbackFlags.add("speed");
          if (otherExt > 0.25) state.feedbackFlags.add("bothMoving");
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
      const hipMidX = (LH.x + RH.x) / 2;
      const legLen = (dist(LH, LA) + dist(RH, RA)) / 2;
      const leftOffset = Math.abs(LA.x - hipMidX);
      const rightOffset = Math.abs(RA.x - hipMidX);

      if (state.baseline === null) {
        state.calibFrames++;
        state.baseline = { left: leftOffset, right: rightOffset };
        if (state.calibFrames < 10) return state;
      }

      const extA = norm(leftOffset - state.baseline.left, 0, legLen * 0.4);
      const extB = norm(rightOffset - state.baseline.right, 0, legLen * 0.4);
      updatePair("A", extA, extB);
      updatePair("B", extB, extA);

      state.baseline.left = state.baseline.left * 0.99 + leftOffset * 0.01;
      state.baseline.right = state.baseline.right * 0.99 + rightOffset * 0.01;

      return state;
    },
    getRepCount() { return state.reps.A + state.reps.B; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("bothMoving")) out.push(M.keepStanceLegStill);
      if (out.length === 0) out.push(M.goodHipAbduction);
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
