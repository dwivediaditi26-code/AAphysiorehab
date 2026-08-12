/**
 * Adductor Squeeze hold tracker. Built on the shared hold engine
 * (holdCounter.js). Assumes a side-on camera, patient supine, knees bent —
 * same camera setup as the other floor exercises.
 *
 * Signal: knee-to-knee distance shrinking from a calibrated resting
 * baseline (knees relaxed, hip-width apart) as the patient squeezes a ball
 * or pillow between them.
 *
 * Heuristic thresholds, not clinically validated — tune against real
 * footage. Coaching feedback, not a diagnostic tool.
 */
import { norm, dist } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createHoldTracker } from "./holdCounter.js";

export function createAdductorSqueezeTracker(config = {}) {
  const holder = createHoldTracker({
    enter: config.enter ?? 0.45,
    breakGraceMs: config.breakGraceMs ?? 700,
    targetMs: config.targetMs ?? 10000,
  });
  const state = { baseline: null, calibFrames: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LK = landmarks[25], RK = landmarks[26];
      const kneeDist = dist(LK, RK);

      if (state.baseline === null) {
        state.calibFrames++;
        state.baseline = kneeDist;
        if (state.calibFrames < 10) return state;
      }

      const ext = norm(state.baseline - kneeDist, 0, Math.max(0.015, state.baseline * 0.35));
      const wasHolding = holder.isHolding();

      const completed = holder.update(ext, now);
      if (completed) state.feedbackFlags.add("done");
      if (wasHolding && !holder.isHolding() && !completed) state.feedbackFlags.add("broke");

      if (!wasHolding && holder.isHolding()) state.feedbackFlags = new Set();

      if (!holder.isHolding()) {
        state.baseline = state.baseline * 0.98 + kneeDist * 0.02;
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
