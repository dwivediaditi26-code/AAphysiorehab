/**
 * Neck Side Bend tracker (ear toward shoulder, lateral flexion). Seated,
 * FRONTAL camera, head and shoulders in frame (framing region 'upper').
 *
 * Source: Saurabh Bothra neck mobility #3 ("extend the side of your neck;
 * pulling your ear up is an easy way to do it" — a lengthening, not a crunch)
 * and the standard cervical lateral-flexion range (~40-45 deg each way).
 *
 * Signal: head roll relative to the trunk (headPose.js headRollDeg: ear line
 * minus shoulder line), change from the patient's own resting value. A rep is
 * a bend to EITHER side and back: ext = |roll change| / TARGET_ROLL. Measured
 * against the shoulder line, so a leaning body or tilted phone cancels out.
 *
 * Wrong form it flags: the shoulder hiking up toward the ear (the shoulder line
 * tilting away from its resting value — the classic way to fake the bend),
 * a jerky fast bend, and a shallow bend ("ear a bit closer to the shoulder").
 *
 * Draft thresholds; validate on real footage before relying on them.
 */
import { clamp01 } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";
import { headRollDeg, shoulderTiltDeg, createStillBaseline } from "./headPose.js";

export function createNeckSideBendTracker(config = {}) {
  const TARGET_ROLL = config.targetRoll ?? 30;      // deg — comfortable side bend (full range is ~40-45)
  const SHALLOW_PEAK = config.shallowPeak ?? 0.7;   // < 21 deg
  const HIKE_FLAG = config.hikeFlag ?? 8;           // deg of shoulder-line tilt change
  const HIKE_FRAMES = config.hikeFrames ?? 4;
  const SPEED_FLAG = config.speedFlag ?? 3.0;       // range-widths / second

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.5 });
  const rollBase = createStillBaseline({ tol: 3 });
  const tiltBase = createStillBaseline({ tol: 3 });
  const state = { lastExt: 0, peak: 0, hikeFrames: 0, history: [], maxRate: 0, flags: new Set() };

  return {
    /** meta.aspect = videoWidth / videoHeight (needed for correct angles). */
    processFrame(landmarks, now = Date.now(), meta = {}) {
      if (!landmarks || landmarks.length < 29) return state;
      if (![7, 8, 11, 12].every((i) => landmarks[i] && (landmarks[i].visibility ?? 1) >= 0.3)) return state;

      const roll = headRollDeg(landmarks, meta.aspect);
      const tilt = shoulderTiltDeg(landmarks, meta.aspect);
      rollBase.update(roll);
      tiltBase.update(tilt);
      if (!rollBase.isCalibrated() || !tiltBase.isCalibrated()) return state;

      const ext = clamp01(Math.abs(roll - rollBase.value()) / TARGET_ROLL);
      state.lastExt = ext;

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
        state.hikeFrames = Math.abs(tilt - tiltBase.value()) > HIKE_FLAG ? state.hikeFrames + 1 : 0;
        if (state.hikeFrames >= HIKE_FRAMES) state.flags.add("hike");
      } else {
        state.history.length = 0;
      }

      const completed = counter.update(ext, now);
      if (completed) {
        if (state.maxRate > SPEED_FLAG) state.flags.add("speed");
        if (state.peak < SHALLOW_PEAK) state.flags.add("shallow");
      }

      if (!wasActive && counter.isActive()) {
        state.flags = new Set(); state.peak = ext; state.maxRate = 0; state.history = []; state.hikeFrames = 0;
      }
      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.flags.has("hike")) out.push(M.shouldersLevel);
      if (state.flags.has("speed")) out.push(M.slowNeck);
      if (state.flags.has("shallow")) out.push(M.bendFurther);
      if (out.length === 0) out.push(M.goodNeckSideBend);
      return out;
    },
    getStatusHint() { return rollBase.isCalibrated() && tiltBase.isCalibrated() ? null : "calibrating"; },
    reset() {
      counter.reset(); rollBase.reset(); tiltBase.reset();
      state.lastExt = 0; state.peak = 0; state.hikeFrames = 0; state.history = []; state.maxRate = 0; state.flags = new Set();
    },
  };
}
