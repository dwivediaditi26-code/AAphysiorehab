/**
 * Side Plank hold tracker. Same pattern as deadBugTracker.js for structure,
 * but built on the shared hold engine (holdCounter.js) instead of
 * repCounter.js — this is a hold, not a rep: the patient lifts into
 * position and the timer runs as long as they stay there.
 *
 * Assumes a side-on camera view, patient side-lying, propping up onto the
 * plank. Signal: hip height relative to a calibrated resting baseline
 * (lying flat before lifting) — the same "lift off the floor" mechanic as
 * gluteBridgeTracker.js/supermanTracker.js, just held instead of repeated.
 *
 * Heuristic thresholds, not clinically validated — tune against real
 * footage. Coaching feedback, not a diagnostic tool.
 */
import { norm } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createHoldTracker } from "./holdCounter.js";

export function createSidePlankTracker(config = {}) {
  const holder = createHoldTracker({
    enter: config.enter ?? 0.5,
    breakGraceMs: config.breakGraceMs ?? 600,
    targetMs: config.targetMs ?? 20000,
  });
  const state = { baseline: null, calibFrames: 0, wasHolding: false, feedbackFlags: new Set() };

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
        state.baseline = hipY;
        if (state.calibFrames < 10) return state;
      }

      const ext = norm(state.baseline - hipY, 0, torsoLen * 0.3);
      const wasHolding = holder.isHolding();

      const completed = holder.update(ext, now);
      if (completed) state.feedbackFlags.add("done");
      if (wasHolding && !holder.isHolding() && !completed) state.feedbackFlags.add("broke");

      if (!wasHolding && holder.isHolding()) state.feedbackFlags = new Set();

      if (!holder.isHolding()) {
        state.baseline = state.baseline * 0.98 + hipY * 0.02;
      }

      return state;
    },
    isHolding() { return holder.isHolding(); },
    getElapsedMs(now) { return holder.getElapsedMs(now); },
    getTargetMs() { return holder.getTargetMs(); },
    getCompletedHolds() { return holder.getCompletedHolds(); },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("broke")) out.push(M.holdBroke);
      if (out.length === 0) out.push(M.goodHold);
      return out;
    },
    reset() {
      holder.reset();
      state.baseline = null; state.calibFrames = 0; state.feedbackFlags = new Set();
    },
  };
}
