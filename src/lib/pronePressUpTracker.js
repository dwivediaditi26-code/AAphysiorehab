/**
 * Prone Press-Up (McKenzie extension) tracker. Same pattern as
 * deadBugTracker.js, built on the shared debounced rep counter
 * (repCounter.js).
 * Assumes prone, side-on camera (same setup as Superman/Bird Dog/Dead Bug).
 * Signal: shoulders rising off the floor relative to a calibrated baseline,
 * while hips are expected to stay roughly put — this is upper-body-only,
 * unlike Superman where everything lifts together. Flags it if the hips
 * rise too, the common "pushing the whole body up" error.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createPronePressUpTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const HIP_RISE_FLAG = config.hipRiseFlag ?? 0.25; // hips rising too much = pushing up, not pressing

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 });
  const state = {
    lastExt: 0, maxDelta: 0, baseline: null, calibFrames: 0, feedbackFlags: new Set(),
  };

  return {
    processFrame(landmarks, now = Date.now()) {
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

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
        if (hipRise > HIP_RISE_FLAG) state.feedbackFlags.add("hipsRising");
      }
      state.lastExt = ext;

      const completed = counter.update(ext, now);
      if (completed && state.maxDelta > SPEED_FLAG) state.feedbackFlags.add("speed");

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxDelta = 0;
      }

      state.baseline.hipY = state.baseline.hipY * 0.99 + hipY * 0.01;

      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("hipsRising")) out.push(M.keepHipsDown);
      if (out.length === 0) out.push(M.goodPressUp);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0;
      state.baseline = null; state.calibFrames = 0; state.feedbackFlags = new Set();
    },
  };
}
