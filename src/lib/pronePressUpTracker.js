/**
 * Prone Press-Up (McKenzie extension) tracker. Same pattern as
 * deadBugTracker.js. Assumes prone, side-on camera (same setup as Superman/
 * Bird Dog/Dead Bug). Signal: shoulders rising off the floor relative to a
 * calibrated baseline, while hips are expected to stay roughly put — this is
 * upper-body-only, unlike Superman where everything lifts together. Flags
 * it if the hips rise too, the common "pushing the whole body up" error.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export function createPronePressUpTracker(config = {}) {
  const ENTER = config.enter ?? 0.35;
  const EXIT = config.exit ?? 0.18;
  const MIN_PEAK = config.minPeak ?? 0.3;
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const HIP_RISE_FLAG = config.hipRiseFlag ?? 0.25; // hips rising too much = pushing up, not pressing

  const state = {
    phase: "idle", peak: 0, reps: 0, lastExt: 0, maxDelta: 0,
    baseline: null, calibFrames: 0, feedbackFlags: new Set(),
  };

  return {
    processFrame(landmarks) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LH = landmarks[23], RH = landmarks[24];
      const shoulderY = (LS.y + RS.y) / 2;
      const hipY = (LH.y + RH.y) / 2;
      const torsoLen = Math.max(0.05, Math.abs(hipY - shoulderY));

      if (state.baseline === null) {
        state.calibFrames++;
        state.baseline = { shoulderY, hipY };
        if (state.calibFrames < 10) return state;
      }

      const ext = norm(state.baseline.shoulderY - shoulderY, 0, torsoLen * 0.6);
      const hipRise = norm(state.baseline.hipY - hipY, 0, torsoLen * 0.6);

      const delta = Math.abs(ext - state.lastExt);
      state.lastExt = ext;
      if (delta > state.maxDelta) state.maxDelta = delta;

      if (state.phase === "idle" && ext > ENTER) {
        state.phase = "rising";
        state.peak = ext;
        state.maxDelta = 0;
      } else if (state.phase === "rising") {
        if (ext > state.peak) {
          state.peak = ext;
          if (hipRise > HIP_RISE_FLAG) state.feedbackFlags.add("hipsRising");
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

      state.baseline.hipY = state.baseline.hipY * 0.99 + hipY * 0.01;

      return state;
    },
    getRepCount() { return state.reps; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("hipsRising")) out.push(M.keepHipsDown);
      if (out.length === 0) out.push(M.goodPressUp);
      return out;
    },
    reset() {
      state.phase = "idle"; state.peak = 0; state.reps = 0; state.lastExt = 0;
      state.maxDelta = 0; state.baseline = null; state.calibFrames = 0; state.feedbackFlags = new Set();
    },
  };
}
