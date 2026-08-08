/**
 * Dead Bug exercise tracker.
 *
 * Pattern: exercise -> required landmarks -> phase state machine -> rep count -> form checks.
 * This is the same engine used by the in-chat demo artifact, extracted here so it can be
 * imported directly into the real app and reused as the template for the next tracker
 * (Glute Bridge, Bird Dog, ...) — see README-phase3.md.
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
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createDeadBugTracker(config = {}) {
  const ENTER = config.enter ?? 0.32;
  const EXIT = config.exit ?? 0.16;
  const MIN_PEAK = config.minPeak ?? 0.28;
  const SPEED_FLAG = config.speedFlag ?? 0.09; // max per-frame delta before "too fast"
  const TRUNK_FLAG = config.trunkFlag ?? 0.05; // normalized hip rise before "back lifted"
  const CALIBRATION_FRAMES = config.calibrationFrames ?? 10;

  const state = {
    phase: { A: "idle", B: "idle" },
    peak: { A: 0, B: 0 },
    reps: { A: 0, B: 0 },
    lastExt: { A: 0, B: 0 },
    maxDelta: { A: 0, B: 0 },
    baselineHipY: null,
    calibFrames: 0,
    feedbackFlags: new Set(),
    lastRepAt: 0,
  };

  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const norm = (v, lo, hi) => clamp01((v - lo) / ((hi - lo) || 1));

  function extensionFor(wrist, shoulder, ankle, hip, hipY, torsoLen) {
    const armLower = norm(wrist.y, shoulder.y, hipY);
    const legLower = norm(ankle.y - hip.y, 0, torsoLen * 0.9);
    return (armLower + legLower) / 2;
  }

  function updatePair(key, ext, otherExt, now) {
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
          state.lastRepAt = now;
          if (state.maxDelta[key] > SPEED_FLAG) state.feedbackFlags.add("speed");
          if (otherExt > 0.25) state.feedbackFlags.add("isolation");
        }
        state.phase[key] = "idle";
        state.peak[key] = 0;
      }
    }
  }

  return {
    /** landmarks: array of {x,y,z,visibility} from PoseLandmarker (normalized 0-1). */
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
        if (state.calibFrames < CALIBRATION_FRAMES) return state;
      }

      const extA = extensionFor(LW, LS, RA, RH, hipY, torsoLen); // left arm + right leg
      const extB = extensionFor(RW, RS, LA, LH, hipY, torsoLen); // right arm + left leg
      updatePair("A", extA, extB, now);
      updatePair("B", extB, extA, now);

      const hipRise = state.baselineHipY - hipY;
      if (hipRise > TRUNK_FLAG) state.feedbackFlags.add("trunk");
      state.baselineHipY = state.baselineHipY * 0.98 + hipY * 0.02;

      return state;
    },
    getRepCount() { return state.reps.A + state.reps.B; },
    getPhase() { return state.phase.A === "extending" ? "A" : state.phase.B === "extending" ? "B" : "idle"; },
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
