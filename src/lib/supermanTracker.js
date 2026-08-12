/**
 * Superman tracker. Same pattern as deadBugTracker.js, built on the shared
 * debounced rep counter (repCounter.js).
 * Assumes prone, side-on camera (same setup as Bird Dog/Dead Bug — camera to
 * the side of the mat). Signal: shoulders and ankles both rising off the
 * floor together, relative to a calibrated resting baseline (same
 * calibration idea as deadBugTracker's hip baseline).
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createSupermanTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const IMBALANCE_FLAG = config.imbalanceFlag ?? 0.35; // one end rising much more than the other

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 });
  const state = {
    lastExt: 0, maxDelta: 0, baseline: null, calibFrames: 0, feedbackFlags: new Set(),
  };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LH = landmarks[23], RH = landmarks[24];
      const LA = landmarks[27], RA = landmarks[28];
      const shoulderY = (LS.y + RS.y) / 2;
      const hipY = (LH.y + RH.y) / 2;
      const ankleY = (LA.y + RA.y) / 2;
      const torsoLen = Math.max(0.05, Math.abs(hipY - shoulderY));

      if (state.baseline === null) {
        state.calibFrames++;
        state.baseline = { shoulderY, ankleY };
        if (state.calibFrames < 10) return state;
      }

      const shoulderLift = norm(state.baseline.shoulderY - shoulderY, 0, torsoLen * 0.5);
      const ankleLift = norm(state.baseline.ankleY - ankleY, 0, torsoLen * 0.5);
      const ext = (shoulderLift + ankleLift) / 2;

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
        if (Math.abs(shoulderLift - ankleLift) > IMBALANCE_FLAG) state.feedbackFlags.add("imbalance");
      }
      state.lastExt = ext;

      const completed = counter.update(ext, now);
      if (completed && state.maxDelta > SPEED_FLAG) state.feedbackFlags.add("speed");

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxDelta = 0;
      }

      state.baseline.shoulderY = state.baseline.shoulderY * 0.99 + shoulderY * 0.01;
      state.baseline.ankleY = state.baseline.ankleY * 0.99 + ankleY * 0.01;

      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("imbalance")) out.push(M.liftTogether);
      if (out.length === 0) out.push(M.goodSuperman);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0;
      state.baseline = null; state.calibFrames = 0; state.feedbackFlags = new Set();
    },
  };
}
