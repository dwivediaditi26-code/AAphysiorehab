/**
 * Bodyweight Squat tracker. Same pattern as deadBugTracker.js, built on the
 * shared debounced rep counter (repCounter.js).
 * Assumes standing, side-on camera. Signal: knee angle (hip-knee-ankle) —
 * near-straight standing, bends toward ~90° at depth. Inverted vs most other
 * trackers here since "rest" is standing tall (high angle), not low.
 * Heuristic thresholds, not clinically validated — tune against real footage.
 */
import { norm, angleAt } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createSquatTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const LEAN_FLAG = config.leanFlag ?? 100; // hip angle below this at peak = too much forward lean
  const KNEE_LOW = config.kneeLow ?? 90;
  const KNEE_HIGH = config.kneeHigh ?? 170;

  const counter = createRepCounter({ enter: config.enter ?? 0.4, exit: config.exit ?? 0.2, minPeak: config.minPeak ?? 0.35 });
  const state = { lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LH = landmarks[23], RH = landmarks[24];
      const LK = landmarks[25], RK = landmarks[26];
      const LA = landmarks[27], RA = landmarks[28];
      const shoulder = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
      const hip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
      const knee = { x: (LK.x + RK.x) / 2, y: (LK.y + RK.y) / 2 };
      const ankle = { x: (LA.x + RA.x) / 2, y: (LA.y + RA.y) / 2 };

      const kneeAngle = angleAt(hip, knee, ankle);
      const hipAngle = angleAt(shoulder, hip, knee);
      const ext = 1 - norm(kneeAngle, KNEE_LOW, KNEE_HIGH); // 0 standing, 1 deep squat

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
        if (hipAngle < LEAN_FLAG) state.feedbackFlags.add("lean");
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
      if (state.feedbackFlags.has("lean")) out.push(M.chestUp);
      if (out.length === 0) out.push(M.goodSquat);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0; state.feedbackFlags = new Set();
    },
  };
}
