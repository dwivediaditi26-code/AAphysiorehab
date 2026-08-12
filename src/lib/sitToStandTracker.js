/**
 * Sit-to-Stand tracker. Same pattern as deadBugTracker.js, built on the
 * shared debounced rep counter (repCounter.js).
 * Assumes seated on a chair, side-on camera. Signal: knee angle (hip-knee-
 * ankle) — bent while seated, near-straight when standing. Same underlying
 * angle as squatTracker.js but opposite rest state (seated, not standing).
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm, angleAt } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createSitToStandTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const KNEE_LOW = config.kneeLow ?? 90;   // seated
  const KNEE_HIGH = config.kneeHigh ?? 170; // standing

  const counter = createRepCounter({ enter: config.enter ?? 0.55, exit: config.exit ?? 0.25, minPeak: config.minPeak ?? 0.5 });
  const state = { lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LH = landmarks[23], RH = landmarks[24];
      const LK = landmarks[25], RK = landmarks[26];
      const LA = landmarks[27], RA = landmarks[28];
      const hip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
      const knee = { x: (LK.x + RK.x) / 2, y: (LK.y + RK.y) / 2 };
      const ankle = { x: (LA.x + RA.x) / 2, y: (LA.y + RA.y) / 2 };
      const kneeAngle = angleAt(hip, knee, ankle);
      const ext = norm(kneeAngle, KNEE_LOW, KNEE_HIGH); // 0 seated, 1 standing

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
      if (out.length === 0) out.push(M.goodStand);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0; state.feedbackFlags = new Set();
    },
  };
}
