/**
 * Bird Dog tracker. Same pattern as deadBugTracker.js: landmarks in, phase
 * state machine, rep count + feedback out — Bird Dog is biomechanically
 * close to Dead Bug (opposite arm + leg extend together), so this reuses
 * the same two-pair structure.
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

export function createBirdDogTracker(config = {}) {
  const ENTER = config.enter ?? 0.35;
  const EXIT = config.exit ?? 0.18;
  const MIN_PEAK = config.minPeak ?? 0.3;
  const SPEED_FLAG = config.speedFlag ?? 0.09;
  const TRUNK_FLAG = config.trunkFlag ?? 0.05; // hip shifting side to side

  const state = {
    phase: { A: "idle", B: "idle" },
    peak: { A: 0, B: 0 },
    reps: { A: 0, B: 0 },
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

  function updatePair(key, ext, otherExt) {
    const delta = Math.abs(ext - state.lastExt[key]);
    state.lastExt[key] = ext;
    if (delta > state.maxDelta[key]) state.maxDelta[key] = delta;

    if (state.phase[key] === "idle" && ext > ENTER) {
      state.phase[key] = "extending";
      state.peak[key] = ext;
      state.maxDelta[key] = 0;
    } else if (state.phase[key] === "extending") {
      if (ext > state.peak[key]) state.peak[key] = ext;
      if (ext < EXIT) {
        if (state.peak[key] >= MIN_PEAK) {
          state.reps[key]++;
          if (state.maxDelta[key] > SPEED_FLAG) state.feedbackFlags.add("speed");
          if (otherExt > 0.25) state.feedbackFlags.add("isolation");
        }
        state.phase[key] = "idle";
        state.peak[key] = 0;
      }
    }
  }

  return {
    processFrame(landmarks) {
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
      updatePair("A", extA, extB);
      updatePair("B", extB, extA);

      const hipShift = Math.abs(state.baselineHipY - hipY);
      if (hipShift > TRUNK_FLAG) state.feedbackFlags.add("trunk");
      state.baselineHipY = state.baselineHipY * 0.98 + hipY * 0.02;

      return state;
    },
    getRepCount() { return state.reps.A + state.reps.B; },
    getExtension() { return { A: state.lastExt.A, B: state.lastExt.B }; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push("Move a little slower through each rep");
      if (state.feedbackFlags.has("trunk")) out.push("Keep your hips level, avoid rocking side to side");
      if (state.feedbackFlags.has("isolation")) out.push("Keep the resting arm and leg still");
      if (out.length === 0) out.push("Controlled movement, good form throughout");
      return out;
    },
    reset() {
      state.phase = { A: "idle", B: "idle" };
      state.peak = { A: 0, B: 0 };
      state.reps = { A: 0, B: 0 };
      state.lastExt = { A: 0, B: 0 };
      state.maxDelta = { A: 0, B: 0 };
      state.baselineHipY = null;
      state.calibFrames = 0;
      state.feedbackFlags = new Set();
    },
  };
}
