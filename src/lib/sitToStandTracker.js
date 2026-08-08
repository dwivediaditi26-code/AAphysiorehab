/**
 * Sit-to-Stand tracker. Same pattern as deadBugTracker.js.
 * Assumes seated on a chair, side-on camera. Signal: knee angle (hip-knee-
 * ankle) — bent while seated, near-straight when standing. Same underlying
 * angle as squatTracker.js but opposite rest state (seated, not standing),
 * so it needs its own polarity rather than sharing that file.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm, angleAt } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createSitToStandTracker(config = {}) {
  const ENTER = config.enter ?? 0.55;
  const EXIT = config.exit ?? 0.25;
  const MIN_PEAK = config.minPeak ?? 0.5;
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const KNEE_LOW = config.kneeLow ?? 90;   // seated
  const KNEE_HIGH = config.kneeHigh ?? 170; // standing

  const state = { phase: "idle", peak: 0, reps: 0, lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks) {
      if (!landmarks || landmarks.length < 29) return state;
      const LH = landmarks[23], RH = landmarks[24];
      const LK = landmarks[25], RK = landmarks[26];
      const LA = landmarks[27], RA = landmarks[28];
      const hip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
      const knee = { x: (LK.x + RK.x) / 2, y: (LK.y + RK.y) / 2 };
      const ankle = { x: (LA.x + RA.x) / 2, y: (LA.y + RA.y) / 2 };
      const kneeAngle = angleAt(hip, knee, ankle);
      const ext = norm(kneeAngle, KNEE_LOW, KNEE_HIGH); // 0 seated, 1 standing

      const delta = Math.abs(ext - state.lastExt);
      state.lastExt = ext;
      if (delta > state.maxDelta) state.maxDelta = delta;

      if (state.phase === "idle" && ext > ENTER) {
        state.phase = "rising";
        state.peak = ext;
        state.maxDelta = 0;
      } else if (state.phase === "rising") {
        if (ext > state.peak) state.peak = ext;
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
      if (out.length === 0) out.push(M.goodStand);
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
