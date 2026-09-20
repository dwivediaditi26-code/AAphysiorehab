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
 * The hip-extension signal now comes from hipExtensionSignal.js (aspect-
 * correct angle, per-patient resting baseline, median filter, low-confidence
 * frames skipped) in 'average' mode — this exercise needs both legs, so it
 * weights left/right by landmark visibility instead of picking one side.
 * NOTE: from a side camera the two legs overlap, so the knee-asymmetry gate
 * is the least reliable part of this tracker — validate on real footage.
 *
 * Heuristic thresholds, not clinically validated — tune against real
 * footage. Coaching feedback, not a diagnostic tool.
 */
import { angleAtAspect } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";
import { createHipExtensionSignal } from "./hipExtensionSignal.js";

export function createSingleLegBridgeTracker(config = {}) {
  const ASYMMETRY_MIN = config.asymmetryMin ?? 25; // degrees between knees to count as "single leg"
  const SPEED_FLAG_PER_SEC = config.speedFlagPerSec ?? 3.5; // range-widths / second (framerate independent)

  const signal = createHipExtensionSignal({ mode: "average", ...config.signal });
  const counter = createRepCounter({
    enter: config.enter ?? 0.5, exit: config.exit ?? 0.15, minPeak: config.minPeak ?? 0.5,
    exitDebounceMs: config.exitDebounceMs ?? 350,
  });
  const state = {
    lastExt: 0, maxRate: 0, history: [], reps: 0, activeLeg: null,
    lastAsymmetryAtPeak: 0, feedbackFlags: new Set(),
  };

  return {
    /** meta.aspect = videoWidth / videoHeight (needed for correct angles). */
    processFrame(landmarks, now = Date.now(), meta = {}) {
      if (!landmarks || landmarks.length < 29) return state;
      const r = signal.process(landmarks, meta);
      if (!r.valid) return state; // low-confidence frame: skip, never guess
      const ext = r.ext;

      const LH = landmarks[23], RH = landmarks[24];
      const LK = landmarks[25], RK = landmarks[26];
      const LA = landmarks[27], RA = landmarks[28];
      const leftKneeAngle = angleAtAspect(LH, LK, LA, meta.aspect);
      const rightKneeAngle = angleAtAspect(RH, RK, RA, meta.aspect);
      const asymmetry = leftKneeAngle - rightKneeAngle;

      const wasActive = counter.isActive();
      if (wasActive) {
        state.history.push({ t: now, ext });
        while (state.history.length && now - state.history[0].t > 300) state.history.shift();
        const ref = state.history.find((h) => now - h.t >= 100);
        if (ref) {
          const rate = Math.abs(ext - ref.ext) / ((now - ref.t) / 1000);
          if (rate > state.maxRate) state.maxRate = rate;
        }
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
        if (state.maxRate > SPEED_FLAG_PER_SEC) state.feedbackFlags.add("speed");
      }

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxRate = 0; state.history = [];
      }

      return state;
    },
    getRepCount() { return state.reps; },
    getActiveLeg() { return state.activeLeg; },
    getStatusHint() { return signal.isCalibrated() ? null : "calibrating"; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("bothLegsDown")) out.push(M.keepNonWorkingLegUp);
      if (state.feedbackFlags.has("speed")) out.push(M.slowerRiseLower);
      if (out.length === 0) out.push(M.goodHeightLegExtended);
      return out;
    },
    reset() {
      counter.reset(); signal.reset();
      state.lastExt = 0; state.maxRate = 0; state.history = []; state.reps = 0;
      state.activeLeg = null; state.lastAsymmetryAtPeak = 0; state.feedbackFlags = new Set();
    },
  };
}
