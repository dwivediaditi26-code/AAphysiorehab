/**
 * Shoulder Abduction tracker. Same pattern as deadBugTracker.js, built on
 * the shared debounced rep counter (repCounter.js).
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
import { createRepCounter } from "./repCounter.js";

export function createShoulderAbductionTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const LEVEL_FLAG = config.levelFlag ?? 0.15; // left/right arm-height mismatch, normalized

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 });
  const state = { lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LW = landmarks[15], RW = landmarks[16];
      const shoulderWidth = Math.max(0.05, Math.abs(LS.x - RS.x));

      const leftAbduction = Math.abs(LW.x - LS.x);
      const rightAbduction = Math.abs(RW.x - RS.x);
      const ext = norm((leftAbduction + rightAbduction) / 2, shoulderWidth * 0.15, shoulderWidth * 1.3);

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
        const heightDiff = Math.abs(LW.y - RW.y) / shoulderWidth;
        if (heightDiff > LEVEL_FLAG) state.feedbackFlags.add("uneven");
      }
      state.lastExt = ext;

      const completed = counter.update(ext, now);
      if (completed && state.maxDelta > SPEED_FLAG) state.feedbackFlags.add("speed");

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxDelta = 0;
      }

      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("uneven")) out.push(M.evenArms);
      if (out.length === 0) out.push(M.goodShoulderAbduction);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0; state.feedbackFlags = new Set();
    },
  };
}
