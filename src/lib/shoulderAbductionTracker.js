/**
 * Shoulder Abduction tracker. Same pattern as deadBugTracker.js, built on
 * the shared debounced rep counter (repCounter.js).
 * Assumes FRONTAL camera (patient facing the camera) — abduction (raising
 * the arm out to the side) is a frontal-plane movement, so this is one of
 * the exercises that actually got MORE reliable when the setup moved from
 * side-view to frontal, not less.
 *
 * Signal: the actual joint angle, not a distance heuristic. Goniometric
 * abduction is measured at the shoulder between the trunk and the humerus
 * (arm at the side = 0 deg, arm raised to horizontal = ~90 deg); the
 * pose-estimation literature's standard stand-in for that is the
 * hip-shoulder-elbow angle (trunk direction = hip->shoulder, upper-arm
 * direction = shoulder->elbow) — the same construction this app already
 * uses for every other joint angle (angleAtAspect, hip-knee-ankle etc.),
 * just applied to the shoulder. Published 2D pose-estimation studies using
 * this exact hip-shoulder-elbow definition report ~9-13 deg mean error
 * against 3D motion capture — a reasonable single-camera baseline, not
 * goniometer-grade. Tracked bilaterally (both arms), matching how this
 * exercise is usually cued; each arm's angle is aspect-corrected.
 * ENTER/EXIT/target are fixed degree thresholds, not per-patient calibrated
 * (unlike the bridge signal) — a draft, reasonable for "raise to about
 * shoulder height," not tuned per body type or validated on real footage.
 */
import { angleAtAspect, clamp01 } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";

export function createShoulderAbductionTracker(config = {}) {
  const REST_ANGLE = config.restAngle ?? 10;     // deg, arm relaxed at the side
  const TARGET_ANGLE = config.targetAngle ?? 90;  // deg, "raise to shoulder height"
  const SPEED_FLAG = config.speedFlag ?? 3.5;     // range-widths / second, framerate independent
  const LEVEL_FLAG = config.levelFlag ?? 20;      // deg, left/right angle mismatch

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.3 });
  const state = { lastExt: 0, history: [], maxRate: 0, feedbackFlags: new Set() };

  return {
    /** meta.aspect = videoWidth / videoHeight (needed for correct angles). */
    processFrame(landmarks, now = Date.now(), meta = {}) {
      if (!landmarks || landmarks.length < 29) return state;
      const LH = landmarks[23], RH = landmarks[24];
      const LS = landmarks[11], RS = landmarks[12];
      const LE = landmarks[13], RE = landmarks[14];

      const leftAngle = angleAtAspect(LH, LS, LE, meta.aspect);
      const rightAngle = angleAtAspect(RH, RS, RE, meta.aspect);
      const ext = clamp01(((leftAngle + rightAngle) / 2 - REST_ANGLE) / (TARGET_ANGLE - REST_ANGLE));

      const wasActive = counter.isActive();
      if (wasActive) {
        state.history.push({ t: now, ext });
        while (state.history.length && now - state.history[0].t > 300) state.history.shift();
        const ref = state.history.find((h) => now - h.t >= 100);
        if (ref) {
          const rate = Math.abs(ext - ref.ext) / ((now - ref.t) / 1000);
          if (rate > state.maxRate) state.maxRate = rate;
        }
        if (Math.abs(leftAngle - rightAngle) > LEVEL_FLAG) state.feedbackFlags.add("uneven");
      } else {
        state.history.length = 0;
      }
      state.lastExt = ext;

      const completed = counter.update(ext, now);
      if (completed && state.maxRate > SPEED_FLAG) state.feedbackFlags.add("speed");

      if (!wasActive && counter.isActive()) {
        state.feedbackFlags = new Set();
        state.maxRate = 0; state.history = [];
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
      state.lastExt = 0; state.history = []; state.maxRate = 0; state.feedbackFlags = new Set();
    },
  };
}
