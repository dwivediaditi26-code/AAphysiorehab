/**
 * Glute Bridge tracker. Same pattern as deadBugTracker.js: landmarks in,
 * shared debounced rep counter (repCounter.js), form checks out.
 *
 * Assumes a side-on camera view, patient supine, knees bent, feet flat.
 * Signal: the shoulder-hip-knee angle — bent at rest, opens up toward a
 * straight line at the top of the bridge.
 *
 * Heuristic thresholds, not clinically validated — tune against real
 * footage. Coaching feedback, not a diagnostic tool.
 */
import { norm, angleAt } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createGluteBridgeTracker(config = {}) {
  const LEVEL_FLAG = config.levelFlag ?? 0.04;
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const ANGLE_LOW = config.angleLow ?? 110;
  const ANGLE_HIGH = config.angleHigh ?? 170;

  const counter = createRepCounter({ enter: config.enter ?? 0.55, exit: config.exit ?? 0.25, minPeak: config.minPeak ?? 0.5 });
  const state = { lastExt: 0, maxDelta: 0, feedbackFlags: new Set() };

  return {
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const LS = landmarks[11], RS = landmarks[12];
      const LH = landmarks[23], RH = landmarks[24];
      const LK = landmarks[25], RK = landmarks[26];
      const shoulder = { x: (LS.x + RS.x) / 2, y: (LS.y + RS.y) / 2 };
      const hip = { x: (LH.x + RH.x) / 2, y: (LH.y + RH.y) / 2 };
      const knee = { x: (LK.x + RK.x) / 2, y: (LK.y + RK.y) / 2 };
      const ext = norm(angleAt(shoulder, hip, knee), ANGLE_LOW, ANGLE_HIGH);

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
        if (Math.abs(LH.y - RH.y) > LEVEL_FLAG) state.feedbackFlags.add("level");
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
    getPhase() { return counter.isActive() ? "rising" : "idle"; },
    getExtension() { return state.lastExt; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (state.feedbackFlags.has("level")) out.push(M.keepHipsLevel);
      if (out.length === 0) out.push(M.goodBridgeHeight);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0; state.feedbackFlags = new Set();
    },
  };
}
