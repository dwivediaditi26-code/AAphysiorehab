/**
 * Shoulder Abduction tracker. Same pattern as deadBugTracker.js.
 * Assumes FRONTAL camera (patient facing the camera) — abduction (raising
 * the arm out to the side) is a frontal-plane movement, so this is one of
 * the exercises that actually got MORE reliable when the setup moved from
 * side-view to frontal, not less. Signal: horizontal (x) distance of each
 * wrist from its own shoulder, normalized by shoulder width so it's
 * distance-from-camera invariant. Tracked bilaterally (both arms together),
 * matching how this exercise is usually cued.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createShoulderAbductionTracker(config = {}) {
  const ENTER = config.enter ?? 0.35;
  const EXIT = config.exit ?? 0.18;
  const MIN_PEAK = config.minPeak ?? 0.3;
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const LEVEL_FLAG = config.levelFlag ?? 0.15; // left/right arm-height mismatch, normalized

  const state = { phase: "idle", peak: 0, reps: 0, lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LW = landmarks[15], RW = landmarks[16];
      const shoulderWidth = Math.max(0.05, Math.abs(LS.x - RS.x));

      const leftAbduction = Math.abs(LW.x - LS.x);
      const rightAbduction = Math.abs(RW.x - RS.x);
      const ext = norm((leftAbduction + rightAbduction) / 2, shoulderWidth * 0.15, shoulderWidth * 1.3);

      const delta = Math.abs(ext - state.lastExt);
      state.lastExt = ext;
      if (delta > state.maxDelta) state.maxDelta = delta;

      if (state.phase === "idle" && ext > ENTER) {
        state.phase = "raising";
        state.peak = ext;
        state.maxDelta = 0;
      } else if (state.phase === "raising") {
        if (ext > state.peak) {
          state.peak = ext;
          const heightDiff = Math.abs(LW.y - RW.y) / shoulderWidth;
          if (heightDiff > LEVEL_FLAG) state.feedbackFlags.add("uneven");
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
      if (state.feedbackFlags.has("uneven")) out.push(M.evenArms);
      if (out.length === 0) out.push(M.goodShoulderAbduction);
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
