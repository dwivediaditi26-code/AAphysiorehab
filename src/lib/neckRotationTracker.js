/**
 * Neck Rotation tracker (look right, look left). Seated, FRONTAL camera, head
 * and shoulders in frame (framing region 'upper').
 *
 * Source: Saurabh Bothra neck mobility #1 ("sit tall and roll your shoulders
 * back; look right and left till you feel slight discomfort" — not forcing it)
 * and the standard cervical rotation range (~80 deg each way, self-paced here).
 *
 * Signal: head yaw estimated from where the nose sits across the head
 * (headPose.js noseOffsetRatio / yawFromOffset), relative to the patient's own
 * resting value. A rep is a turn to EITHER side and back to centre: ext =
 * |yaw| / TARGET_YAW. A single frontal camera can't measure yaw precisely
 * (nose-offset geometry, a few degrees of slop), so thresholds are generous
 * and the cue is "turn a bit more", not a number.
 *
 * Wrong form it flags: shoulders turning along with the head (shoulder width
 * shrinking well below its resting value — "turn only your neck"), a jerky
 * fast turn, and a shallow turn ("turn a little further").
 *
 * Draft thresholds; validate on real footage before relying on them.
 */
import { clamp01 } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";
import { noseOffsetRatio, yawFromOffset, createStillBaseline } from "./headPose.js";

export function createNeckRotationTracker(config = {}) {
  const TARGET_YAW = config.targetYaw ?? 60;        // deg — a comfortable full turn
  const SHALLOW_PEAK = config.shallowPeak ?? 0.75;  // < 45 deg
  const TORSO_RATIO = config.torsoRatio ?? 0.88;    // shoulder width below this fraction of rest = torso turning
  const TORSO_FRAMES = config.torsoFrames ?? 5;
  const SPEED_FLAG = config.speedFlag ?? 3.0;       // range-widths / second

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.15, minPeak: config.minPeak ?? 0.5 });
  const offsetBase = createStillBaseline({ tol: 0.05 });
  const widthBase = createStillBaseline({ tol: 0.02 });
  const state = { lastExt: 0, yaw: 0, peak: 0, torsoFrames: 0, history: [], maxRate: 0, flags: new Set() };

  return {
    /** meta.aspect = videoWidth / videoHeight (unused here — all x-axis ratios cancel it). */
    processFrame(landmarks, now = Date.now()) {
      if (!landmarks || landmarks.length < 29) return state;
      const need = [0, 11, 12];
      if (!need.every((i) => landmarks[i] && (landmarks[i].visibility ?? 1) >= 0.3)) return state;

      const ratio = noseOffsetRatio(landmarks);
      if (ratio === null) return state;
      const width = Math.abs(landmarks[11].x - landmarks[12].x);

      offsetBase.update(ratio);
      widthBase.update(width);
      if (!offsetBase.isCalibrated() || !widthBase.isCalibrated()) return state;

      const yaw = yawFromOffset(ratio, offsetBase.value());
      const ext = clamp01(Math.abs(yaw) / TARGET_YAW);
      state.yaw = yaw; state.lastExt = ext;

      const wasActive = counter.isActive();
      if (wasActive) {
        if (ext > state.peak) state.peak = ext;
        state.history.push({ t: now, ext });
        while (state.history.length && now - state.history[0].t > 300) state.history.shift();
        const ref = state.history.find((h) => now - h.t >= 100);
        if (ref) {
          const rate = Math.abs(ext - ref.ext) / ((now - ref.t) / 1000);
          if (rate > state.maxRate) state.maxRate = rate;
        }
        state.torsoFrames = width < widthBase.value() * TORSO_RATIO ? state.torsoFrames + 1 : 0;
        if (state.torsoFrames >= TORSO_FRAMES) state.flags.add("torso");
      } else {
        state.history.length = 0;
      }

      const completed = counter.update(ext, now);
      if (completed) {
        if (state.maxRate > SPEED_FLAG) state.flags.add("speed");
        if (state.peak < SHALLOW_PEAK) state.flags.add("shallow");
      }

      if (!wasActive && counter.isActive()) {
        state.flags = new Set(); state.peak = ext; state.maxRate = 0; state.history = []; state.torsoFrames = 0;
      }
      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.flags.has("torso")) out.push(M.keepShouldersSquare);
      if (state.flags.has("speed")) out.push(M.slowNeck);
      if (state.flags.has("shallow")) out.push(M.turnFurther);
      if (out.length === 0) out.push(M.goodNeckRotation);
      return out;
    },
    getStatusHint() { return offsetBase.isCalibrated() && widthBase.isCalibrated() ? null : "calibrating"; },
    reset() {
      counter.reset(); offsetBase.reset(); widthBase.reset();
      state.lastExt = 0; state.yaw = 0; state.peak = 0; state.torsoFrames = 0; state.history = []; state.maxRate = 0; state.flags = new Set();
    },
  };
}
