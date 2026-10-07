// Neck + shoulder form rules: headPose.js measurements, the 'upper' framing
// region, the three seated neck trackers (Chin Tuck, Neck Rotation, Neck Side
// Bend), the shoulder compensation cues, and the full session pipeline. Run:
//   node test-form-rules.mjs
//
// All landmarks are SYNTHETIC, built in "height units" (u right, v down) and
// converted to MediaPipe's per-axis normalised coordinates at a 16:9 aspect,
// so a wrong aspect correction shows up as a wrong angle. They prove the code
// does what the rules say; they do NOT prove the thresholds are right for real
// patients — that needs real footage (see README).
import {
  headRollDeg, shoulderTiltDeg, shoulderWidth, noseOffsetRatio, yawFromOffset, NOSE_REACH,
  faceDirection, forwardHeadDeg, headPitchDeg, createStillBaseline,
} from "./src/lib/headPose.js";
import { assessFraming } from "./src/lib/poseQuality.js";
import { createLiveSession } from "./src/lib/liveSession.js";
import { createChinTuckTracker } from "./src/lib/chinTuckTracker.js";
import { createNeckRotationTracker } from "./src/lib/neckRotationTracker.js";
import { createNeckSideBendTracker } from "./src/lib/neckSideBendTracker.js";
import { createShoulderAbductionTracker } from "./src/lib/shoulderAbductionTracker.js";
import { createShoulderFlexionTracker } from "./src/lib/shoulderFlexionTracker.js";
import { FEEDBACK_MESSAGES as M } from "./src/lib/feedbackMessages.js";
import {
  TRACKED_EXERCISE_COMPONENTS, TRACKER_FRAMING_REGION, TRACKER_CAMERA_ORIENTATION, cameraSetupTip,
} from "./src/lib/trackedExercises.js";
import { EXERCISES_SEED, INSTRUCTIONS_MAP, REGIONS } from "./src/data/seed.js";

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`PASS  ${name}${detail ? "  →  " + detail : ""}`); }
  else { failed++; console.log(`FAIL  ${name}${detail ? "  →  " + detail : ""}`); }
}
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;
const deg = (d) => (d * Math.PI) / 180;
const section = (t) => console.log(`\n--- ${t} ---\n`);

const A = 16 / 9;                 // video aspect used by every test
const MS = 33;                    // ~30 fps
const P = (u, v, visibility = 0.95) => ({ x: u / A, y: v, z: 0, visibility });
const blank = () => Array.from({ length: 33 }, () => ({ x: 0.5, y: 1.3, z: 0, visibility: 0.05 })); // everything else: out of frame, unseen

// ---------------------------------------------------------------- builders
/** Seated side view: shoulder, ear above/in front of it, nose in front of the ear. */
function sideHead({ dir = 1, fwd = 25, pitch = 10, shift = 0, farVis = 0.3, farGarbage = false } = {}) {
  const lm = blank();
  const neck = 0.2, S = { u: 0.5 + shift, v: 0.66 }; // a close-up head (~25 cm ear-to-shoulder at a 0.5 m frame)
  const E = { u: S.u + dir * neck * Math.tan(deg(fwd)), v: S.v - neck };
  const N = { u: E.u + dir * 0.13 * Math.cos(deg(pitch)), v: E.v + 0.13 * Math.sin(deg(pitch)) };
  lm[0] = P(N.u, N.v); lm[7] = P(E.u, E.v); lm[11] = P(S.u, S.v);
  lm[8] = farGarbage ? P(0.9, 0.2, farVis) : P(E.u + 0.01, E.v, 0.2);
  lm[12] = farGarbage ? P(0.1, 0.9, farVis) : P(S.u + 0.01, S.v, 0.3);
  return lm;
}

/** Seated front view. yaw: head turn; roll: ear-line tilt; tilt: shoulder-line tilt; torsoTurn: shoulder width scale. */
function frontHead({ yaw = 0, roll = 0, tilt = 0, torsoTurn = 1, farEarHidden = false } = {}) {
  const lm = blank();
  const cx = 0.5, sv = 0.62, W = 0.3 * torsoTurn;
  const rot = (du, dv, a) => ({ u: du * Math.cos(deg(a)) - dv * Math.sin(deg(a)), v: du * Math.sin(deg(a)) + dv * Math.cos(deg(a)) });
  const s11 = rot(W / 2, 0, tilt), s12 = rot(-W / 2, 0, tilt);
  lm[11] = P(cx + s11.u, sv + s11.v); lm[12] = P(cx + s12.u, sv + s12.v);
  const H = { u: cx, v: 0.42 };
  const e7 = rot(0.08, 0, roll), e8 = rot(-0.08, 0, roll);
  lm[7] = P(H.u + e7.u, H.v + e7.v); lm[8] = farEarHidden ? P(0.95, 0.1, 0.2) : P(H.u + e8.u, H.v + e8.v);
  const earMidU = (H.u + e7.u + H.u + e8.u) / 2, earMidV = H.v;
  const refU = farEarHidden ? cx : earMidU;
  lm[0] = P(refU + NOSE_REACH * W * Math.sin(deg(yaw)), earMidV + 0.04);
  return lm;
}

const ease = (i, n) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, i / n));
/** 0..1 profile: still (calibration), rise, hold, fall, still. */
function profile({ cal = 22, up = 16, hold = 6, down = 16, tail = 10 } = {}) {
  const out = [];
  for (let i = 0; i < cal; i++) out.push(0);
  for (let i = 1; i <= up; i++) out.push(ease(i, up));
  for (let i = 0; i < hold; i++) out.push(1);
  for (let i = 1; i <= down; i++) out.push(1 - ease(i, down));
  for (let i = 0; i < tail; i++) out.push(0);
  return out;
}
function drive(tracker, ks, build, t0 = 1_000_000) {
  ks.forEach((k, i) => tracker.processFrame(build(k, i), t0 + i * MS, { aspect: A }));
  return t0 + ks.length * MS;
}
const cues = (tr) => tr.getFeedback().map((f) => f.en);

// ================================================================ 1
section("headPose.js: exact angles from known geometry (16:9 frame, aspect-corrected)");
{
  const lmRoll = frontHead({ roll: 20 });
  check("headRollDeg reads a 20 deg ear-line tilt as 20", near(Math.abs(headRollDeg(lmRoll, A)), 20, 0.01), headRollDeg(lmRoll, A).toFixed(3));
  check("headRollDeg is 0 for level ears and shoulders", near(headRollDeg(frontHead({}), A), 0, 0.01));
  const both = frontHead({ roll: 20, tilt: 20 });
  check("Roll is measured against the shoulder line: a whole-body tilt cancels out", near(headRollDeg(both, A), 0, 0.01), headRollDeg(both, A).toFixed(3));
  check("Without the aspect correction the same frame misreads (proves the correction matters)", Math.abs(headRollDeg(lmRoll, 1)) < 19 || Math.abs(headRollDeg(lmRoll, 1)) > 21);
  check("shoulderTiltDeg reads a 12 deg shoulder-line tilt as 12", near(Math.abs(shoulderTiltDeg(frontHead({ tilt: 12 }), A)), 12, 0.01));
  const yawLm = frontHead({ yaw: 40 });
  const ratio = noseOffsetRatio(yawLm);
  check("yawFromOffset recovers a 40 deg head turn", near(Math.abs(yawFromOffset(ratio, 0)), 40, 0.05), yawFromOffset(ratio, 0).toFixed(3));
  check("Turning the other way gives the opposite sign", near(yawFromOffset(noseOffsetRatio(frontHead({ yaw: -40 })), 0), -yawFromOffset(ratio, 0), 0.05));
  check("Far ear hidden (what a big turn looks like): falls back to the shoulder midpoint and still reads 55", near(Math.abs(yawFromOffset(noseOffsetRatio(frontHead({ yaw: 55, farEarHidden: true })), 0)), 55, 0.1));
  check("yawFromOffset clamps instead of returning NaN for an impossible offset", near(yawFromOffset(5, 0), 90, 0.001));
  check("shoulderWidth is in height units (x scaled by aspect)", near(shoulderWidth(frontHead({}), A), 0.3, 0.001), shoulderWidth(frontHead({}), A).toFixed(4));
}
{
  const s = sideHead({ fwd: 25 });
  check("forwardHeadDeg reads ear 25 deg in front of the shoulder as 25", near(forwardHeadDeg(s[7], s[11], 1, A), 25, 0.01), forwardHeadDeg(s[7], s[11], 1, A).toFixed(3));
  const sm = sideHead({ fwd: 25, dir: -1 });
  check("Mirrored (face pointing the other way) gives the same forward-head angle", near(forwardHeadDeg(sm[7], sm[11], faceDirection(sm[0], sm[7]), A), 25, 0.01), `dir ${faceDirection(sm[0], sm[7])}`);
  check("faceDirection follows the nose", faceDirection(s[0], s[7]) === 1 && faceDirection(sm[0], sm[7]) === -1);
  check("Ear stacked over the shoulder reads 0", near(forwardHeadDeg(sideHead({ fwd: 0 })[7], sideHead({ fwd: 0 })[11], 1, A), 0, 0.01));
  check("headPitchDeg reads a nose 30 deg below the ear as 30", near(headPitchDeg(sideHead({ pitch: 30 })[7], sideHead({ pitch: 30 })[0], A), 30, 0.01));
  check("...and a nose 15 deg above the ear as -15", near(headPitchDeg(sideHead({ pitch: -15 })[7], sideHead({ pitch: -15 })[0], A), -15, 0.01));
}
{
  const b = createStillBaseline({ frames: 5, tol: 1, giveUp: 20 });
  [10, 10.2, 9.9, 10.1, 10].forEach((v) => b.update(v));
  check("Baseline calibrates once the values sit still", b.isCalibrated() && near(b.value(), 10, 0.05), b.value());
  b.update(50);
  check("...and does not move afterward", near(b.value(), 10, 0.05));
  const b2 = createStillBaseline({ frames: 5, tol: 1, giveUp: 12 });
  for (let i = 0; i < 12; i++) b2.update(i * 5);
  check("Never settles -> gives up after giveUp samples instead of waiting forever", b2.isCalibrated());
  const b3 = createStillBaseline({ frames: 3, tol: 1, giveUp: 10 });
  b3.update(NaN); b3.update(Infinity);
  check("Non-finite samples are ignored", !b3.isCalibrated());
  b.reset();
  check("reset() clears it", !b.isCalibrated());
}

// ================================================================ 2
section("'upper' framing region: head + shoulders only must not be told to 'move back'");
{
  const frontal = frontHead({});
  const asWhole = assessFraming(frontal, { orientation: "frontal", region: "whole", aspect: A });
  check("OLD behaviour (control): a head-and-shoulders frame under the whole-body rule is flagged", asWhole.status !== "ok", asWhole.status);
  const up = assessFraming(frontal, { orientation: "frontal", region: "upper", aspect: A });
  check("Frontal 'upper': head + both shoulders in frame, nothing below -> ok", up.status === "ok", up.status);
  const side = assessFraming(sideHead({}), { orientation: "side", region: "upper", aspect: A });
  check("Side 'upper': nose + near ear + near shoulder -> ok, near side picked", side.status === "ok" && side.side === "left", `${side.status}/${side.side}`);
  const cut = frontHead({}); cut[11] = P(0.65, 1.2);
  check("A shoulder clearly below the image is reported cut_off", assessFraming(cut, { orientation: "frontal", region: "upper", aspect: A }).status === "cut_off");
  const edge = frontHead({}); edge[11] = P(0.65, 0.995); edge[12] = P(0.35, 0.995);
  check("Shoulders sitting right on the bottom edge (laptop webcam) are accepted", assessFraming(edge, { orientation: "frontal", region: "upper", aspect: A }).status === "ok");
  const tiny = frontHead({});
  [0, 7, 8, 11, 12].forEach((i) => { tiny[i] = P(0.5 + (tiny[i].x * A - 0.5) * 0.15, 0.5 + (tiny[i].y - 0.5) * 0.15); });
  check("A tiny head far from the camera is too_small", assessFraming(tiny, { orientation: "frontal", region: "upper", aspect: A }).status === "too_small");
  check("Nobody in shot -> no_person", assessFraming(blank(), { orientation: "frontal", region: "upper", aspect: A }).status === "no_person");
  const lowConf = frontHead({}); [0, 7, 8, 11, 12].forEach((i) => { lowConf[i].visibility = 0.32; });
  check("Barely-visible head/shoulders -> low_confidence", assessFraming(lowConf, { orientation: "frontal", region: "upper", aspect: A }).status === "low_confidence");
  const flip = sideHead({});
  const withPrev = assessFraming(flip, { orientation: "side", region: "upper", aspect: A, prevSide: "left" });
  check("Near side stays sticky for 'upper' too", withPrev.side === "left");
}

// ================================================================ 3
section("Chin Tuck: ear slides back over the shoulder, chin stays level");
{
  // baseline: head forward 25 deg; a full tuck draws it back to ~8 (>= the 14 deg range)
  const full = (k) => sideHead({ fwd: 25 - 17 * k, pitch: 10 });
  const tr = createChinTuckTracker();
  drive(tr, profile(), full);
  check("A clean tuck-and-return counts exactly 1 rep", tr.getRepCount() === 1, `reps ${tr.getRepCount()}`);
  check("...with 'good' feedback", tr.getFeedback()[0].good === true, cues(tr)[0]);

  const tr2 = createChinTuckTracker();
  let t = drive(tr2, profile(), full);
  t = drive(tr2, profile({ cal: 0 }), full, t);
  check("Two tucks -> 2 reps", tr2.getRepCount() === 2, `reps ${tr2.getRepCount()}`);

  const trM = createChinTuckTracker();
  drive(trM, profile(), (k) => sideHead({ dir: -1, fwd: 25 - 17 * k }));
  check("Works with the face pointing the other way (mirrored)", trM.getRepCount() === 1, `reps ${trM.getRepCount()}`);

  const trN = createChinTuckTracker();
  drive(trN, profile(), (k) => sideHead({ fwd: 25 - 17 * k, pitch: 10 + 22 * k }));
  check("Nodding down while tucking is still a rep but says 'keep your chin level'", trN.getRepCount() === 1 && cues(trN)[0] === M.keepChinLevel.en, cues(trN)[0]);

  const trS = createChinTuckTracker();
  drive(trS, profile(), (k) => sideHead({ fwd: 25 - 8 * k, pitch: 10 }));
  check("A shallow tuck counts but says 'draw your head a little further back'", trS.getRepCount() === 1 && cues(trS)[0] === M.tuckFurther.en, `reps ${trS.getRepCount()} ${cues(trS)[0]}`);

  const trL = createChinTuckTracker();
  drive(trL, profile(), () => sideHead({ fwd: 25, pitch: 10, shift: 0 }).map((p, i) => p));
  check("Static (no movement) counts nothing", trL.getRepCount() === 0);

  const trB = createChinTuckTracker();
  drive(trB, profile(), (k) => sideHead({ fwd: 25, pitch: 10, shift: -0.12 * k }));
  check("Leaning the whole trunk back (ear and shoulder move together) is NOT a tuck", trB.getRepCount() === 0, `reps ${trB.getRepCount()}`);

  const trF = createChinTuckTracker();
  const tAfter = drive(trF, profile(), (k) => sideHead({ fwd: 25 - 17 * k, pitch: 10 }));
  const before = trF.getRepCount();
  // far side suddenly looks far more confident than the true near side, with garbage positions
  const flipFrames = profile({ cal: 0 });
  drive(trF, flipFrames, (k) => {
    const lm = sideHead({ fwd: 25 - 17 * k, pitch: 10, farVis: 0.99, farGarbage: true });
    lm[7].visibility = 0.55; lm[11].visibility = 0.55;
    return lm;
  }, tAfter);
  check("Near side is LOCKED after calibration: a far side that briefly looks better can't corrupt it", trF.getRepCount() === before + 1, `reps ${trF.getRepCount()} (expected ${before + 1})`);

  const trH = createChinTuckTracker();
  trH.processFrame(sideHead({}), 1000, { aspect: A });
  check("Reports 'calibrating' until the resting head position is measured", trH.getStatusHint() === "calibrating");
  drive(trH, profile({ cal: 25, up: 1, hold: 0, down: 1, tail: 0 }), () => sideHead({}));
  check("...and null afterward", trH.getStatusHint() === null);

  const trR = createChinTuckTracker();
  drive(trR, profile(), full); trR.reset();
  check("reset() clears reps and re-opens calibration", trR.getRepCount() === 0 && trR.getStatusHint() === "calibrating");

  const trG = createChinTuckTracker();
  drive(trG, profile(), (k) => sideHead({ fwd: 3 - 5 * k, pitch: 10 }));
  check("Good posture (little forward head to start): a small real tuck still counts", trG.getRepCount() === 1, `reps ${trG.getRepCount()}`);
}

// ================================================================ 4
section("Neck Rotation: look right, look left; shoulders stay square");
{
  const turn = (sign, deg_ = 55) => (k) => frontHead({ yaw: sign * deg_ * k });
  const tr = createNeckRotationTracker();
  drive(tr, profile(), turn(1));
  check("A full turn to one side and back counts 1 rep", tr.getRepCount() === 1, `reps ${tr.getRepCount()}`);
  check("...with 'good' feedback", tr.getFeedback()[0].good === true, cues(tr)[0]);

  const trLR = createNeckRotationTracker();
  let t = drive(trLR, profile(), turn(1));
  drive(trLR, profile({ cal: 0 }), turn(-1), t);
  check("Right then left -> 2 reps (either direction counts)", trLR.getRepCount() === 2, `reps ${trLR.getRepCount()}`);

  const trHid = createNeckRotationTracker();
  drive(trHid, profile(), (k) => frontHead({ yaw: 62 * k, farEarHidden: k > 0.5 }));
  check("Counts a big turn even when the far ear drops out of view mid-turn", trHid.getRepCount() === 1, `reps ${trHid.getRepCount()}`);

  const trSh = createNeckRotationTracker();
  drive(trSh, profile(), turn(1, 33));
  check("A shallow turn counts but says 'turn a little further'", trSh.getRepCount() === 1 && cues(trSh)[0] === M.turnFurther.en, `reps ${trSh.getRepCount()} ${cues(trSh)[0]}`);

  const trTiny = createNeckRotationTracker();
  drive(trTiny, profile(), turn(1, 12));
  check("A tiny wiggle is not a rep", trTiny.getRepCount() === 0);

  const trTo = createNeckRotationTracker();
  drive(trTo, profile(), (k) => frontHead({ yaw: 55 * k, torsoTurn: 1 - 0.2 * k }));
  check("Shoulders turning with the head -> 'turn only your neck'", trTo.getRepCount() === 1 && cues(trTo)[0] === M.keepShouldersSquare.en, cues(trTo)[0]);

  const trFast = createNeckRotationTracker();
  drive(trFast, profile({ up: 6, down: 6, hold: 2 }), turn(1));
  check("A jerky fast turn -> 'slowly'", cues(trFast).includes(M.slowNeck.en), cues(trFast).join(" | "));

  const trStat = createNeckRotationTracker();
  drive(trStat, profile(), () => frontHead({}));
  check("Static head counts nothing", trStat.getRepCount() === 0);

  const trOff = createNeckRotationTracker();
  drive(trOff, profile(), (k) => { const lm = frontHead({ yaw: 55 * k }); lm[0].x += 0.03 / A; return lm; });
  check("A nose that rests slightly off-centre is handled by the per-patient baseline", trOff.getRepCount() === 1, `reps ${trOff.getRepCount()}`);
}

// ================================================================ 5
section("Neck Side Bend: ear toward shoulder; shoulders stay level");
{
  const bend = (deg_ = 28, sign = 1) => (k) => frontHead({ roll: sign * deg_ * k });
  const tr = createNeckSideBendTracker();
  drive(tr, profile(), bend());
  check("A full side bend and back counts 1 rep", tr.getRepCount() === 1, `reps ${tr.getRepCount()}`);
  check("...with 'good' feedback", tr.getFeedback()[0].good === true, cues(tr)[0]);

  const trLR = createNeckSideBendTracker();
  let t = drive(trLR, profile(), bend(28, 1));
  drive(trLR, profile({ cal: 0 }), bend(28, -1), t);
  check("Each side counts -> 2 reps", trLR.getRepCount() === 2, `reps ${trLR.getRepCount()}`);

  const trSh = createNeckSideBendTracker();
  drive(trSh, profile(), bend(17));
  check("A shallow bend counts but says 'ear a little closer to your shoulder'", trSh.getRepCount() === 1 && cues(trSh)[0] === M.bendFurther.en, `reps ${trSh.getRepCount()} ${cues(trSh)[0]}`);

  const trHike = createNeckSideBendTracker();
  drive(trHike, profile(), (k) => frontHead({ roll: 28 * k, tilt: 14 * k }));
  check("Shoulder hiking toward the ear (shoulder line tilts) -> 'keep both shoulders level'", cues(trHike)[0] === M.shouldersLevel.en, cues(trHike)[0]);

  const trBody = createNeckSideBendTracker();
  drive(trBody, profile(), (k) => frontHead({ roll: 15 * k, tilt: 15 * k }));
  check("Whole upper body tilting (head AND shoulder line together) is not credited as a neck bend", trBody.getRepCount() === 0, `reps ${trBody.getRepCount()}`);

  const trRest = createNeckSideBendTracker();
  drive(trRest, profile(), (k) => frontHead({ roll: 6 + 28 * k, tilt: 3 }));
  check("A head that rests slightly tilted at the start is handled by the baseline", trRest.getRepCount() === 1, `reps ${trRest.getRepCount()}`);

  const trFast = createNeckSideBendTracker();
  drive(trFast, profile({ up: 6, down: 6, hold: 2 }), bend());
  check("A jerky fast bend -> 'slowly'", cues(trFast).includes(M.slowNeck.en), cues(trFast).join(" | "));

  const trStat = createNeckSideBendTracker();
  drive(trStat, profile(), () => frontHead({}));
  check("Static head counts nothing", trStat.getRepCount() === 0);
}

// ================================================================ 6
section("Shoulder raise: compensation cues from the video study (abduction = frontal, flexion = side)");
// Arm elevation A is the hip-shoulder-elbow angle; builder keeps it exact.
function armLm({ side, A_deg, lean = 0, shrug = 0, elbowBend = 0, wristVisible = true }) {
  const lm = blank();
  const vis = 0.95;
  const rot = (u, a) => ({ x: u.x * Math.cos(deg(a)) - u.y * Math.sin(deg(a)), y: u.x * Math.sin(deg(a)) + u.y * Math.cos(deg(a)) });
  const place = (shIdx, hipIdx, elIdx, wrIdx, earIdx, sh, hip, sign, dirX) => {
    const shp = { x: sh.x + lean, y: sh.y - shrug };
    lm[shIdx] = { ...shp, z: 0, visibility: vis }; lm[hipIdx] = { ...hip, z: 0, visibility: vis };
    lm[earIdx] = { x: sh.x + lean * 0.5, y: sh.y - 0.12, z: 0, visibility: vis };
    const down = { x: hip.x - shp.x, y: hip.y - shp.y }; const len = Math.hypot(down.x, down.y);
    const u = { x: down.x / len, y: down.y / len };
    const d = rot(u, sign * A_deg);
    const el = { x: shp.x + d.x * 0.18, y: shp.y + d.y * 0.18 };
    lm[elIdx] = { ...el, z: 0, visibility: vis };
    const d2 = rot(d, sign * elbowBend);
    lm[wrIdx] = { x: el.x + d2.x * 0.17, y: el.y + d2.y * 0.17, z: 0, visibility: wristVisible ? vis : 0.1 };
  };
  if (side === "both") {
    place(11, 23, 13, 15, 7, { x: 0.4, y: 0.3 }, { x: 0.42, y: 0.6 }, +1);
    place(12, 24, 14, 16, 8, { x: 0.6, y: 0.3 }, { x: 0.58, y: 0.6 }, -1);
  } else {
    place(11, 23, 13, 15, 7, { x: 0.45, y: 0.3 }, { x: 0.45, y: 0.6 }, -1);
    lm[12] = { x: 0.46, y: 0.3, z: 0, visibility: 0.2 }; lm[24] = { x: 0.46, y: 0.6, z: 0, visibility: 0.2 };
  }
  return lm;
}
const raise = (peak = 100) => (k) => 10 + (peak - 10) * k;
function runShoulder(factory, side, mod, peak = 100, prof = profile({ cal: 25, up: 25, hold: 8, down: 25, tail: 10 })) {
  const tr = factory();
  const t0 = 2_000_000;
  prof.forEach((k, i) => tr.processFrame(armLm({ side, A_deg: raise(peak)(k), ...mod(k) }), t0 + i * 40, {}));
  return tr;
}
for (const [label, factory, side, good] of [
  ["Abduction", createShoulderAbductionTracker, "both", M.goodShoulderAbduction],
  ["Flexion", createShoulderFlexionTracker, "near", M.goodShoulderFlexion],
]) {
  const clean = runShoulder(factory, side, () => ({}));
  check(`${label}: clean rep counts and stays 'good' (no false compensation cues)`, clean.getRepCount() === 1 && clean.getFeedback()[0].en === good.en, `reps ${clean.getRepCount()} ${cues(clean)[0]}`);
  const shrug = runShoulder(factory, side, (k) => ({ shrug: 0.035 * k }));
  check(`${label}: shoulder shrugging up toward the ear -> 'don't shrug'`, shrug.getRepCount() === 1 && cues(shrug)[0] === M.dontShrug.en, `reps ${shrug.getRepCount()} ${cues(shrug)[0]}`);
  const lean = runShoulder(factory, side, (k) => ({ lean: (side === "both" ? 0.09 : -0.09) * k }));
  check(`${label}: trunk leaning to get the arm up -> 'stand tall'`, lean.getRepCount() === 1 && cues(lean)[0] === M.standTallNoLean.en, `reps ${lean.getRepCount()} ${cues(lean)[0]}`);
  const elbow = runShoulder(factory, side, () => ({ elbowBend: 55 }));
  check(`${label}: bent elbow at the top -> 'keep your elbow straight'`, elbow.getRepCount() === 1 && cues(elbow)[0] === M.elbowStraight.en, `reps ${elbow.getRepCount()} ${cues(elbow)[0]}`);
  const shallow = runShoulder(factory, side, () => ({}), 55);
  check(`${label}: stopping well short -> 'raise a little higher' (rep still counts)`, shallow.getRepCount() === 1 && cues(shallow)[0] === M.raiseArmHigher.en, `reps ${shallow.getRepCount()} ${cues(shallow)[0]}`);
  const noWrist = runShoulder(factory, side, () => ({ elbowBend: 55, wristVisible: false }));
  check(`${label}: an unseen wrist can't invent an elbow fault`, noWrist.getFeedback()[0].en === good.en, cues(noWrist)[0]);
  const high = runShoulder(factory, side, (k) => ({ shrug: 0.03 * k }), 165);
  check(`${label}: reaching overhead (scapular rotation is normal there) is not called a shrug`, !cues(high).includes(M.dontShrug.en), cues(high)[0]);
  const two = factory();
  let tt = 3_000_000;
  const p1 = profile({ cal: 25, up: 25, hold: 8, down: 25, tail: 10 });
  for (const k of [...p1, ...p1.slice(25)]) { two.processFrame(armLm({ side, A_deg: raise(100)(k) }), tt, {}); tt += 40; }
  check(`${label}: a second clean rep after the first is still counted`, two.getRepCount() === 2, `reps ${two.getRepCount()}`);
  const flagsClear = runShoulder(factory, side, (k) => ({ shrug: 0.035 * k }));
  tt = 4_000_000;
  for (const k of p1.slice(25)) { flagsClear.processFrame(armLm({ side, A_deg: raise(100)(k) }), tt, {}); tt += 40; }
  check(`${label}: a shrugged rep doesn't poison the next clean one`, flagsClear.getRepCount() === 2 && flagsClear.getFeedback()[0].en === good.en, `${cues(flagsClear)[0]}`);
}
{
  const tr = createShoulderAbductionTracker();
  const idle = Array(40).fill(0);
  idle.forEach((k, i) => tr.processFrame(armLm({ side: "both", A_deg: 10 }), 5_000_000 + i * 40, {}));
  check("Abduction: standing still with the arms at the sides is never flagged or counted", tr.getRepCount() === 0 && tr.getFeedback()[0].good === true);
  tr.reset();
  check("reset() works after the form watch is added", tr.getRepCount() === 0);
}

// ================================================================ 7
section("Full session pipeline: head-and-shoulders-only shot gets a countdown and counts, with no 'move back'");
function sessionRun(exId, build, ks) {
  const sess = createLiveSession({
    trackerFactory: TRACKED_EXERCISE_COMPONENTS[exId],
    orientation: TRACKER_CAMERA_ORIENTATION[exId],
    region: TRACKER_FRAMING_REGION[exId],
  });
  let now = 8_000_000, framingPrompts = 0, go = false, last = null, repEvents = [];
  const settle = Math.round(5800 / MS);
  for (let i = 0; i < settle; i++, now += MS) {
    last = sess.process(build(0, i), now, { aspect: A });
    for (const e of last.events) { if (e.type === "framing") framingPrompts++; if (e.type === "go") go = true; }
  }
  for (let i = 0; i < ks.length; i++, now += MS) {
    last = sess.process(build(ks[i], i), now, { aspect: A });
    for (const e of last.events) { if (e.type === "framing") framingPrompts++; if (e.type === "rep") repEvents.push(e); }
  }
  return { last, framingPrompts, go, repEvents };
}
{
  const r = sessionRun("e29", (k) => sideHead({ fwd: 25 - 17 * k, pitch: 10 }), profile({ cal: 0 }));
  check("Chin Tuck session: framing is ok (no 'Move back' prompt over the whole run)", r.framingPrompts === 0 && r.last.framing.status === "ok", `prompts ${r.framingPrompts}, status ${r.last.framing.status}`);
  check("...the countdown reached Go", r.go);
  check("...and the tuck is counted after Go", r.last.reps === 1 && r.repEvents.length === 1, `reps ${r.last.reps}`);
  check("...with a spoken rep event carrying no correction (clean rep)", r.repEvents[0] && r.repEvents[0].correction === null);
}
{
  const r = sessionRun("e30", (k) => frontHead({ yaw: 55 * k }), profile({ cal: 0 }));
  check("Neck Rotation session: no framing prompts, Go reached, 1 rep", r.framingPrompts === 0 && r.go && r.last.reps === 1, `prompts ${r.framingPrompts}, reps ${r.last.reps}`);
}
{
  const r = sessionRun("e31", (k) => frontHead({ roll: 28 * k }), profile({ cal: 0 }));
  check("Neck Side Bend session: no framing prompts, Go reached, 1 rep", r.framingPrompts === 0 && r.go && r.last.reps === 1, `prompts ${r.framingPrompts}, reps ${r.last.reps}`);
}
{
  const r = sessionRun("e29", (k) => sideHead({ fwd: 25 - 17 * k, pitch: 10 + 22 * k }), profile({ cal: 0 }));
  check("Wrong form (nodding) in a session: the rep event carries the spoken correction", r.repEvents[0] && r.repEvents[0].correction && r.repEvents[0].correction.en === M.keepChinLevel.en, r.repEvents[0] && r.repEvents[0].correction && r.repEvents[0].correction.voiceEn);
}

// ================================================================ 8
section("Registry, seed data and bilingual cues");
{
  for (const id of ["e29", "e30", "e31"]) {
    check(`${id}: registered tracker, camera orientation and 'upper' framing region`, typeof TRACKED_EXERCISE_COMPONENTS[id] === "function" && !!TRACKER_CAMERA_ORIENTATION[id] && TRACKER_FRAMING_REGION[id] === "upper");
    const ex = EXERCISES_SEED.find((e) => e.id === id);
    check(`${id}: in the exercise library as a tracked Neck exercise`, !!ex && ex.region === "Neck" && ex.tracking === true, ex && ex.name);
    const steps = INSTRUCTIONS_MAP[id];
    check(`${id}: has step-by-step instructions in English and Hindi`, Array.isArray(steps) && steps.length >= 3 && steps.every((s) => s.en && /[ऀ-ॿ]/.test(s.hi)));
    const tr = TRACKED_EXERCISE_COMPONENTS[id]();
    check(`${id}: factory builds a tracker with the standard interface`, ["processFrame", "getRepCount", "getFeedback", "reset"].every((m) => typeof tr[m] === "function"));
  }
  check("'Neck' is a library region", REGIONS.includes("Neck"));
  check("Setup tips: seated side-on for chin tuck", cameraSetupTip("e29") === M.cameraSetupTipSeatedSide);
  check("Setup tips: seated facing the camera for rotation and side bend", cameraSetupTip("e30") === M.cameraSetupTipSeatedFrontal && cameraSetupTip("e31") === M.cameraSetupTipSeatedFrontal);
  check("Setup tips for existing exercises are unchanged", cameraSetupTip("e3") === M.cameraSetupTipLowerBody && cameraSetupTip("e14") === M.cameraSetupTipFrontal && cameraSetupTip("e4") === M.cameraSetupTipSide);

  const newKeys = ["moveBackUpperBody", "cameraSetupTipSeatedFrontal", "cameraSetupTipSeatedSide", "tuckFurther", "keepChinLevel", "goodChinTuck",
    "turnFurther", "keepShouldersSquare", "goodNeckRotation", "bendFurther", "shouldersLevel", "goodNeckSideBend", "slowNeck",
    "dontShrug", "standTallNoLean", "elbowStraight", "raiseArmHigher"];
  const dev = /[ऀ-ॿ]/;
  check("Every new cue exists with English text, Hindi text, and short spoken lines in BOTH languages",
    newKeys.every((k) => { const m = M[k]; return m && m.en && m.voiceEn && dev.test(m.hi) && dev.test(m.voiceHi); }),
    newKeys.filter((k) => { const m = M[k]; return !(m && m.en && m.voiceEn && dev.test(m.hi) && dev.test(m.voiceHi)); }).join(","));
  check("Spoken lines are short enough to hear mid-rep (<= 4 words)", newKeys.filter((k) => !k.startsWith("cameraSetup")).every((k) => M[k].voiceEn.split(/\s+/).length <= 4 && M[k].voiceHi.split(/\s+/).length <= 4));
  check("'good' cues are marked good, corrections are not", ["goodChinTuck", "goodNeckRotation", "goodNeckSideBend"].every((k) => M[k].good) && ["tuckFurther", "keepChinLevel", "turnFurther", "dontShrug", "standTallNoLean", "elbowStraight"].every((k) => !M[k].good));
  check("Hindi uses everyday words for the body parts (गर्दन, कंधे, कोहनी, ठुड्डी)", /गर्दन/.test(M.slowNeck.hi) && /कंधे/.test(M.dontShrug.hi) && /कोहनी/.test(M.elbowStraight.hi) && /ठुड्डी/.test(M.keepChinLevel.hi));
}

console.log(`\n${failed === 0 ? `All ${passed} form-rule checks passed.` : `${failed} FAILED, ${passed} passed.`}`);
if (failed) process.exit(1);
