/**
 * Heel Raises tracker. Same pattern as deadBugTracker.js, built on the
 * shared debounced rep counter (repCounter.js).
 * Assumes standing, side-on camera. Signal: vertical gap between the toe and
 * heel landmarks (heel lifts, toe stays planted), normalized by leg length.
 * Needs the heel/toe landmarks (indices 29-32), which PoseLandmarker always
 * outputs alongside the other 33 points — no separate model needed.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm, dist } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createHeelRaiseTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.1;
  const counter = createRepCounter({ enter: config.enter ?? 0.4, exit: config.exit ?? 0.2, minPeak: config.minPeak ?? 0.3 });
  const state = { lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 33) return state; // needs heel/toe landmarks
      const LH = landmarks[23], RH = landmarks[24];
      const LA = landmarks[27], RA = landmarks[28];
      const LHeel = landmarks[29], RHeel = landmarks[30];
      const LToe = landmarks[31], RToe = landmarks[32];

      const legLen = (dist(LH, LA) + dist(RH, RA)) / 2;
      const leftLift = LToe.y - LHeel.y;
      const rightLift = RToe.y - RHeel.y;
      const ext = norm((leftLift + rightLift) / 2, 0, Math.max(0.02, legLen * 0.18));

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
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
      if (out.length === 0) out.push(M.goodHeelRaise);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0; state.feedbackFlags = new Set();
    },
  };
}
