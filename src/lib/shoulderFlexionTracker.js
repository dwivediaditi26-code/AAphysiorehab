/**
 * Shoulder Flexion tracker. Same pattern as deadBugTracker.js.
 * Assumes standing, side-on camera — flexion (raising the arm forward) is a
 * sagittal-plane movement, so it actually works from the side, unlike
 * abduction (raising out to the side), which needs a front-facing camera and
 * isn't built here. Signal: wrist height relative to shoulder, normalized by
 * torso length.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createShoulderFlexionTracker(config = {}) {
  const ENTER = config.enter ?? 0.35;
  const EXIT = config.exit ?? 0.18;
  const MIN_PEAK = config.minPeak ?? 0.3;
  const SPEED_FLAG = config.speedFlag ?? 0.1;

  const state = { phase: "idle", peak: 0, reps: 0, lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LW = landmarks[15], RW = landmarks[16];
      const LH = landmarks[23], RH = landmarks[24];
      const shoulder = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
      const wrist = { x: (LW.x + RW.x) / 2, y: (LW.y + RW.y) / 2 };
      const hip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
      const torsoLen = Math.max(0.05, Math.abs(hip.y - shoulder.y));

      // arm hanging: wrist well below shoulder. raised to shoulder height: wrist.y ~ shoulder.y.
      const ext = norm(shoulder.y - wrist.y, -torsoLen * 0.5, torsoLen * 0.15);

      const delta = Math.abs(ext - state.lastExt);
      state.lastExt = ext;
      if (delta > state.maxDelta) state.maxDelta = delta;

      if (state.phase === "idle" && ext > ENTER) {
        state.phase = "raising";
        state.peak = ext;
        state.maxDelta = 0;
      } else if (state.phase === "raising") {
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
      if (out.length === 0) out.push(M.goodShoulderFlexion);
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
