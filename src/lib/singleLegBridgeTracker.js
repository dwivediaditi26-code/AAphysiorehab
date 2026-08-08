/**
 * Single Leg Bridge tracker. Same pattern as deadBugTracker.js: landmarks in,
 * phase state machine, rep count + feedback out.
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

export function createSingleLegBridgeTracker(config = {}) {
  const ENTER = config.enter ?? 0.55;
  const EXIT = config.exit ?? 0.25;
  const MIN_PEAK = config.minPeak ?? 0.5;
  const SPEED_FLAG = config.speedFlag ?? 0.12;
  const ASYMMETRY_MIN = config.asymmetryMin ?? 25; // degrees between knees to count as "single leg"
  const ANGLE_LOW = config.angleLow ?? 110;
  const ANGLE_HIGH = config.angleHigh ?? 170;

  const state = {
    phase: "idle",
    peak: 0,
    reps: 0,
    lastExt: 0,
    maxDelta: 0,
    activeLeg: null,
    feedbackFlags: new Set(),
  };

  return {
    processFrame(landmarks) {
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

      const delta = Math.abs(ext - state.lastExt);
      state.lastExt = ext;
      if (delta > state.maxDelta) state.maxDelta = delta;

      if (state.phase === "idle" && ext > ENTER) {
        state.phase = "rising";
        state.peak = ext;
        state.maxDelta = 0;
        state.activeLeg = asymmetry > 0 ? "A" : "B";
      } else if (state.phase === "rising") {
        if (ext > state.peak) state.peak = ext;
        if (ext < EXIT) {
          if (state.peak >= MIN_PEAK) {
            if (Math.abs(asymmetry) < ASYMMETRY_MIN) {
              state.feedbackFlags.add("bothLegsDown");
            } else {
              state.reps++;
            }
            if (state.maxDelta > SPEED_FLAG) state.feedbackFlags.add("speed");
          }
          state.phase = "idle";
          state.peak = 0;
        }
      }
      return state;
    },
    getRepCount() { return state.reps; },
    getActiveLeg() { return state.activeLeg; },
    getFeedback() {
      const out = [];
      if (state.feedbackFlags.has("bothLegsDown")) out.push("Keep the non-working leg lifted and straight");
      if (state.feedbackFlags.has("speed")) out.push("Rise and lower a little slower");
      if (out.length === 0) out.push("Good height, leg stayed extended");
      return out;
    },
    reset() {
      state.phase = "idle";
      state.peak = 0;
      state.reps = 0;
      state.lastExt = 0;
      state.maxDelta = 0;
      state.activeLeg = null;
      state.feedbackFlags = new Set();
    },
  };
}
