/**
 * Chin Tuck (cervical retraction) tracker. Seated, SIDE-ON camera, head and
 * shoulders in frame (framing region 'upper').
 *
 * What the exercise is, from the demonstration videos this was built from
 * (AskDoctorJo "Chin Tucks Sitting", Saurabh Bothra neck mobility #4): the
 * head slides straight BACK on the neck, like making a double chin. It is a
 * translation, not a nod — "it's not tucking it forward", the chin stays level.
 *
 * Signal: forward-head angle (headPose.js) — the ear's offset in front of the
 * shoulder, as an angle from vertical. A tuck lowers it toward 0 (ear stacked
 * over the shoulder). Measured against the patient's OWN resting value
 * (per-patient baseline, first still ~0.5 s), 0 = resting head position,
 * 1 = the ear has drawn back by RANGE degrees. Leaning the whole trunk back
 * moves ear and shoulder together, so it does NOT register as a tuck — that
 * compensation is rejected by the signal itself.
 *
 * Wrong form it flags: nodding (the ear->nose line pitches away from its
 * resting value by more than NOD_FLAG degrees: "keep your chin level"), and a
 * shallow tuck ("draw it a little further back").
 *
 * The near side is chosen from ear + shoulder visibility and then LOCKED once
 * the baseline calibrates, for the same reason as hipExtensionSignal.js: a
 * baseline measured on one side means nothing on the other.
 *
 * Draft thresholds: the 2D angle numbers are reasonable, not validated on real
 * patient footage. Not a diagnostic tool.
 */
import { clamp01 } from "./trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";
import { createRepCounter } from "./repCounter.js";
import { forwardHeadDeg, headPitchDeg, faceDirection, createStillBaseline } from "./headPose.js";

const CHAIN = {
  left: { ear: 7, shoulder: 11 },
  right: { ear: 8, shoulder: 12 },
};
const MIN_VIS = 0.3;

export function createChinTuckTracker(config = {}) {
  const MIN_RANGE = config.minRange ?? 6;      // deg — never ask for less than this (people with good posture have little to retract)
  const MAX_RANGE = config.maxRange ?? 14;     // deg — a full tuck, however forward the head started
  const NOD_FLAG = config.nodFlag ?? 12;       // deg of pitch change that counts as nodding
  const SHALLOW_PEAK = config.shallowPeak ?? 0.7;

  const counter = createRepCounter({ enter: config.enter ?? 0.35, exit: config.exit ?? 0.18, minPeak: config.minPeak ?? 0.45 });
  const fwdBase = createStillBaseline({ tol: 3 });
  const pitchBase = createStillBaseline({ tol: 4 });
  const state = { lastExt: 0, peak: 0, side: "left", sideLocked: false, dir: 1, flags: new Set() };

  function chooseSide(lm) {
    if (state.sideLocked) return;
    const vis = (i) => lm[i].visibility ?? 1;
    const score = (s) => vis(CHAIN[s].ear) + vis(CHAIN[s].shoulder);
    if (state.side === "left" && score("right") > score("left") + 0.3) state.side = "right";
    else if (state.side === "right" && score("left") > score("right") + 0.3) state.side = "left";
  }

  return {
    /** meta.aspect = videoWidth / videoHeight. */
    processFrame(landmarks, now = Date.now(), meta = {}) {
      if (!landmarks || landmarks.length < 29) return state;
      chooseSide(landmarks);
      const ear = landmarks[CHAIN[state.side].ear], shoulder = landmarks[CHAIN[state.side].shoulder], nose = landmarks[0];
      if (![ear, shoulder, nose].every((p) => p && (p.visibility ?? 1) >= MIN_VIS)) return state;

      state.dir = faceDirection(nose, ear, state.dir);
      const fwd = forwardHeadDeg(ear, shoulder, state.dir, meta.aspect);
      const pitch = headPitchDeg(ear, nose, meta.aspect);

      fwdBase.update(fwd);
      pitchBase.update(pitch);
      if (!fwdBase.isCalibrated() || !pitchBase.isCalibrated()) return state;
      state.sideLocked = true;

      const range = Math.max(MIN_RANGE, Math.min(MAX_RANGE, fwdBase.value()));
      const ext = clamp01((fwdBase.value() - fwd) / range);
      state.lastExt = ext;

      const wasActive = counter.isActive();
      if (wasActive) {
        if (ext > state.peak) state.peak = ext;
        if (Math.abs(pitch - pitchBase.value()) > NOD_FLAG) state.flags.add("nod");
      }
      const completed = counter.update(ext, now);
      if (completed && state.peak < SHALLOW_PEAK) state.flags.add("shallow");

      if (!wasActive && counter.isActive()) { state.flags = new Set(); state.peak = ext; }
      return state;
    },
    getRepCount() { return counter.getRepCount(); },
    getFeedback() {
      const out = [];
      if (state.flags.has("nod")) out.push(M.keepChinLevel);
      if (state.flags.has("shallow")) out.push(M.tuckFurther);
      if (out.length === 0) out.push(M.goodChinTuck);
      return out;
    },
    getStatusHint() { return fwdBase.isCalibrated() && pitchBase.isCalibrated() ? null : "calibrating"; },
    reset() {
      counter.reset(); fwdBase.reset(); pitchBase.reset();
      state.lastExt = 0; state.peak = 0; state.side = "left"; state.sideLocked = false; state.dir = 1; state.flags = new Set();
    },
  };
}
