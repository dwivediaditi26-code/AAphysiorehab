/**
 * Hip Hinge tracker. Same pattern as deadBugTracker.js.
 * Assumes standing, side-on camera. Signal: hip angle (shoulder-hip-knee) —
 * near-straight standing, folds down toward horizontal as the patient hinges
 * forward. Form check: knee angle should stay relatively open — if it drops
 * too, that's a squat, not a hinge.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm, angleAt } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createHipHingeTracker(config = {}) {
  const ENTER = config.enter ?? 0.4;
  const EXIT = config.exit ?? 0.2;
  const MIN_PEAK = config.minPeak ?? 0.35;
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const HIP_LOW = config.hipLow ?? 100;
  const HIP_HIGH = config.hipHigh ?? 175;
  const KNEE_BEND_FLAG = config.kneeBendFlag ?? 140; // knee angle below this at peak = squatting, not hinging

  const state = { phase: "idle", peak: 0, reps: 0, lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LH = landmarks[23], RH = landmarks[24];
      const LK = landmarks[25], RK = landmarks[26];
      const LA = landmarks[27], RA = landmarks[28];
      const shoulder = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
      const hip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
      const knee = { x: (LK.x + RK.x) / 2, y: (LK.y + RK.y) / 2 };
      const ankle = { x: (LA.x + RA.x) / 2, y: (LA.y + RA.y) / 2 };

      const hipAngle = angleAt(shoulder, hip, knee);
      const kneeAngle = angleAt(hip, knee, ankle);
      const ext = 1 - norm(hipAngle, HIP_LOW, HIP_HIGH); // 0 standing, 1 fully hinged

      const delta = Math.abs(ext - state.lastExt);
      state.lastExt = ext;
      if (delta > state.maxDelta) state.maxDelta = delta;

      if (state.phase === "idle" && ext > ENTER) {
        state.phase = "hinging";
        state.peak = ext;
        state.maxDelta = 0;
      } else if (state.phase === "hinging") {
        if (ext > state.peak) {
          state.peak = ext;
          if (kneeAngle < KNEE_BEND_FLAG) state.feedbackFlags.add("kneesBending");
        }
        if (ext < EXIT) {
          if (state.peak >= MIN_PEAK) {
            state.reps++;
            if (state.maxDelta > SPEED_FLAG) state.feedbackFlags.add("speed");
          }
          state.phase = "idle";
          state.peak = 0;
        }
      }
      return state;
    },
    getRepCount() { return state.reps; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("kneesBending")) out.push(M.kneesSoft);
      if (out.length === 0) out.push(M.goodHipHinge);
      return out;
    },
    reset() {
      state.phase = "idle";
      state.peak = 0;
      state.reps = 0;
      state.lastExt = 0;
      state.maxDelta = 0;
      state.feedbackFlags = new Set();
    },
  };
}
