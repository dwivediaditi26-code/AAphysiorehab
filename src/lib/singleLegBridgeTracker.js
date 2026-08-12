/**
 * Single Leg Bridge tracker. Same pattern as deadBugTracker.js, built on the
 * shared debounced rep counter (repCounter.js) for the phase/return
 * detection — with an extra gate on top: the counter's "completed" signal
 * only means "a genuine bridge happened", not "counts as single-leg". This
 * tracker only increments its own rep tally when that completed bridge also
 * passes the knee-asymmetry check, same logic as before, just layered on
 * the shared debounce instead of duplicating it.
 *
 * Builds on the same hip-extension signal as gluteBridgeTracker.js, but only
 * counts a rep when one knee is meaningfully straighter than the other at the
 * peak — i.e. one leg genuinely stayed extended and lifted, not a two-leg
 * bridge. Reports which side looked straighter as `activeLeg`, but treat
 * that as an approximate read, not a confirmed left/right assignment.
 *
 * Heuristic thresholds, not clinically validated — tune against real
 * footage. Coaching feedback, not a diagnostic tool.
 */
import { norm, angleAt } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createSingleLegBridgeTracker(config = {}) {
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const ASYMMETRY_MIN = config.asymmetryMin ?? 25; // degrees between knees to count as "single leg"
  const ANGLE_LOW = config.angleLow ?? 110;
  const ANGLE_HIGH = config.angleHigh ?? 170;

  const counter = createRepCounter({ enter: config.enter ?? 0.55, exit: config.exit ?? 0.25, minPeak: config.minPeak ?? 0.5 });
  const state = {
    lastExt: 0, maxDelta: 0, reps: 0, activeLeg: null,
    lastAsymmetryAtPeak: 0, feedbackFlags: new Set(),
  };

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
      const ext = norm(angleAt(shoulder, hip, knee), ANGLE_LOW, ANGLE_HIGH);

      const leftKneeAngle = angleAt(LH, LK, LA);
      const rightKneeAngle = angleAt(RH, RK, RA);
      const asymmetry = leftKneeAngle - rightKneeAngle;

      const wasActive = counter.isActive();
      if (wasActive) {
        const delta = Math.abs(ext - state.lastExt);
        if (delta > state.maxDelta) state.maxDelta = delta;
        if (ext > counter.getPeak() - 0.001) {
          state.lastAsymmetryAtPeak = asymmetry;
          state.activeLeg = asymmetry > 0 ? "A" : "B";
        }
      }
      state.lastExt = ext;

      const completed = counter.update(ext, now);
      if (completed) {
        if (Math.abs(state.lastAsymmetryAtPeak) < ASYMMETRY_MIN) {
          state.feedbackFlags.add("bothLegsDown");
        } else {
          state.reps++;
        }
        if (state.maxDelta > SPEED_FLAG) state.feedbackFlags.add("speed");
      }

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxDelta = 0;
      }

      return state;
    },
    getRepCount() { return state.reps; },
    getActiveLeg() { return state.activeLeg; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("bothLegsDown")) out.push(M.keepNonWorkingLegUp);
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (out.length === 0) out.push(M.goodHeightLegExtended);
      return out;
    },
    reset() {
      counter.reset();
      state.lastExt = 0; state.maxDelta = 0; state.reps = 0;
      state.activeLeg = null; state.lastAsymmetryAtPeak = 0; state.feedbackFlags = new Set();
    },
  };
}
