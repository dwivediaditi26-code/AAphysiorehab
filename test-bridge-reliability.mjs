// Bridge + pose-quality reliability tests on REAL MediaPipe output.
//   node test-bridge-reliability.mjs        (also run by `npm test`)
//
// Fixture: test-fixtures/glute-bridge-real-landmarks.json — 474 frames of raw
// per-frame MediaPipe Pose (Full) landmarks from a real side-view glute bridge
// clip: rest -> lift -> hold. Landmark numbers only, no imagery. The clip has
// no descent, so a "rep" is built by playing it forward then in reverse (real
// landmark noise, real rest/top angles).
//
// What this proves: correct reps count exactly, jitter/glitches don't add or
// remove reps, wrong-form reps get the right correction and correct ones get
// none, and the "Move back" nag fires only when the body really is out of frame.
// What it CANNOT prove: accuracy on your patients' phones/rooms/clothing — for
// that, add real footage (correct AND wrong reps) to test-fixtures/.
import fs from "fs";
import { createGluteBridgeTracker } from "./src/lib/gluteBridgeTracker.js";
import { createHipExtensionSignal } from "./src/lib/hipExtensionSignal.js";
import { createLandmarkSmoother } from "./src/lib/landmarkSmoother.js";
import { createPoseQuality, assessFraming } from "./src/lib/poseQuality.js";
import { isWholeBodyInFrame, angleAt, angleAtAspect } from "./src/lib/trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "./src/lib/feedbackMessages.js";
import { createSingleLegBridgeTracker } from "./src/lib/singleLegBridgeTracker.js";
import { createStartCountdown } from "./src/lib/startCountdown.js";
import { createLiveSession } from "./src/lib/liveSession.js";
import { createPelvicLiftSignal } from "./src/lib/pelvicLiftSignal.js";
import { createRepCounter } from "./src/lib/repCounter.js";

const fx = JSON.parse(fs.readFileSync(new URL("./test-fixtures/glute-bridge-real-landmarks.json", import.meta.url)));
const ASPECT = fx.aspect;
const DT = 1000 / fx.fps;

function expand(frame) {
  const a = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0 }));
  for (const [k, v] of Object.entries(frame.lm)) a[+k] = { x: v[0], y: v[1], z: 0, visibility: v[2] };
  return a;
}
const clone = (lms) => lms.map((p) => ({ ...p }));
const base = fx.frames.map(expand);

// deterministic RNG so tests are repeatable
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r) { return Math.sqrt(-2 * Math.log(r() + 1e-9)) * Math.cos(2 * Math.PI * r()); }

/** Extension (0-1) of every fixture frame, via the same signal the tracker uses. */
const extOf = (() => {
  const sig = createHipExtensionSignal();
  return base.map((l) => sig.process(l, { aspect: ASPECT }).ext ?? 0);
})();
const firstAt = (thr) => extOf.findIndex((e) => e >= thr);
const TOP = base.length - 1;

/** Play a list of fixture-frame indices at `speed`x, returning [{lms, t}]. */
function play(indices, { speed = 1, t0 = 1000 } = {}) {
  let t = t0;
  return indices.map((i) => { const f = { lms: clone(base[i]), t }; t += DT / speed; return f; });
}
const range = (a, b) => { const r = []; if (a <= b) for (let i = a; i <= b; i++) r.push(i); else for (let i = a; i >= b; i--) r.push(i); return r; };
const restIdx = range(0, firstAt(0.05) - 1);                    // resting frames before lift
const restHold = () => range(30, 60);                            // a stretch of clean rest
const oneRep = (peakIdx = TOP) => [...range(0, peakIdx), ...range(peakIdx, 0)];

// `transform` is applied to the settle-at-rest frames, so a test that alters the
// picture (masks the upper body, changes the frame shape) alters those too.
function runTracker(frames, { smooth = true, trackerConfig, transform = (l) => l, aspect = ASPECT } = {}) {
  const tracker = createGluteBridgeTracker(trackerConfig);
  const sm = createLandmarkSmoother();
  let t = 0;
  for (const f of frames) {
    const lms = smooth ? sm.smooth(f.lms, f.t) : f.lms;
    tracker.processFrame(lms, f.t, { aspect });
    t = f.t;
  }
  // settle at rest so the last rep can finalize (debounce)
  for (let i = 0; i < 30; i++) {
    t += DT;
    const rest = transform(clone(base[0]));
    const lms = smooth ? sm.smooth(rest, t) : rest;
    tracker.processFrame(lms, t, { aspect });
  }
  return tracker;
}

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  →  " + detail : ""}`);
}

// ---------------------------------------------------------------- 1. framing / "go back go back"
console.log("\n--- 1. 'Move back' nag: real, correctly-framed side-view clip ---\n");
const oldNag = base.filter((l) => !isWholeBodyInFrame(l)).length;
check("OLD isWholeBodyInFrame nagged on this perfectly framed clip", oldNag === base.length, `${oldNag}/${base.length} frames flagged (far-side knee/wrist/ankle visibility < 0.5)`);

{
  const q = createPoseQuality({ orientation: "side" });
  let spoke = 0, nonOk = 0, armedAt = null, t = 1000;
  for (const l of base) {
    const r = q.process(clone(l), t);
    if (r.framing.speak) spoke++;
    if (r.framing.status !== "ok" && r.framing.status !== "initializing") nonOk++;
    if (r.armed && armedAt === null) armedAt = t - 1000;
    t += DT;
  }
  check("NEW framing: never reports a problem on the correct setup", nonOk === 0 && spoke === 0, `problem frames ${nonOk}, voice prompts ${spoke}`);
  check("NEW framing: arms within ~1 s of a good view", armedAt !== null && armedAt <= 1200, `armed after ${armedAt} ms`);
}

{
  // Real cut-off: BOTH legs' knees & ankles pushed below the bottom edge (phone too close / tilted).
  const q = createPoseQuality({ orientation: "side" });
  let t = 1000, first = null, spoke = 0;
  for (let i = 0; i < 1500; i++) { // 50 s
    const l = clone(base[100]);
    for (const j of [25, 26, 27, 28]) { l[j].y = 1.06; l[j].visibility = 0.2; }
    const r = q.process(l, t);
    if (r.framing.status === "cut_off" && first === null) first = t - 1000;
    if (r.framing.speak) spoke++;
    t += DT;
  }
  check("Cut-off body IS reported (as 'cut_off' -> 'move back')", first !== null && first >= 1000 && first <= 2600, `reported after ${first} ms`);
  check("Voice prompt is capped (<= 3 in 50 s, not every few seconds)", spoke >= 1 && spoke <= 3, `${spoke} prompts`);
}

{
  // One bad frame must not flip the status.
  const q = createPoseQuality({ orientation: "side" });
  let t = 1000, flips = 0, prev = null;
  for (let i = 0; i < 200; i++) {
    const l = clone(base[100]);
    if (i === 120) { for (const j of [25, 26, 27, 28]) { l[j].y = 1.1; } } // single glitch frame
    const r = q.process(l, t); t += DT;
    if (prev && prev !== r.framing.status) flips++;
    prev = r.framing.status;
  }
  check("A single bad frame does not flash a warning", flips === 1 /* initializing->ok only */, `status changes: ${flips}`);
}

{
  const l = clone(base[100]);
  for (const p of l) { p.x = 0.5 + (p.x - 0.5) * 0.35; p.y = 0.5 + (p.y - 0.5) * 0.35; }
  check("Tiny-in-frame person -> 'too_small' (move closer)", assessFraming(l, { orientation: "side" }).status === "too_small");
  // torso still seen (0.5) but legs uncertain (0.1) on both sides = the model is unsure, not the framing
  const dark = clone(base[100]); for (const j of [11, 12, 23, 24]) dark[j].visibility = 0.5; for (const j of [25, 26, 27, 28]) dark[j].visibility = 0.1;
  check("Body seen but model unsure (light/clothing/clutter) -> 'low_confidence'", assessFraming(dark, { orientation: "side" }).status === "low_confidence");
  check("No pose -> 'no_person'", assessFraming(null, { orientation: "side" }).status === "no_person");
}

// ---------------------------------------------------------------- 2. rep counting on real landmarks
console.log("\n--- 2. Rep counting on real landmarks (3 correct reps built from the real clip) ---\n");
const threeReps = play([...oneRep(), ...restHold(), ...oneRep(), ...restHold(), ...oneRep()]);
{
  const t = runTracker(threeReps);
  check("3 correct reps -> exactly 3 (smoothed, aspect-correct)", t.getRepCount() === 3, `counted ${t.getRepCount()}`);
  const raw = runTracker(threeReps, { smooth: false });
  check("3 correct reps -> exactly 3 even with the smoother off", raw.getRepCount() === 3, `counted ${raw.getRepCount()}`);
  check("Correct reps get NO false correction", t.getFeedback().every((f) => f.good), `feedback: ${t.getFeedback().map((f) => f.voiceEn).join(", ")}`);
  const stats = t.getLastRepStats();
  check("Rep stats report a full-height lift", stats && stats.peakExt >= 0.9, `peak ${stats && stats.peakExt.toFixed(2)}`);
}
{
  const idle = runTracker(play([...restHold(), ...restHold(), ...restHold()]));
  check("Lying still (no movement) -> 0 reps", idle.getRepCount() === 0, `counted ${idle.getRepCount()}`);
}

// ---------------------------------------------------------------- 3. robustness: noise + hallucinated frames
console.log("\n--- 3. Robustness: heavy noise + hallucinated joints ---\n");
{
  const r = rng(7);
  const noisy = threeReps.map(({ lms, t }) => {
    const out = clone(lms);
    for (const p of out) { p.x += gauss(r) * 0.006; p.y += gauss(r) * 0.006; } // ~4-6 px of jitter at 1056 wide
    // ~4% of frames: near-side knee/hip "hallucinate" to a random place with low confidence
    if (r() < 0.04) for (const j of [23, 25]) { out[j].x = r(); out[j].y = r(); out[j].visibility = 0.12; }
    return { lms: out, t };
  });
  const t = runTracker(noisy);
  check("Noise + 4% hallucinated frames -> still exactly 3 reps", t.getRepCount() === 3, `counted ${t.getRepCount()}`);
  check("...and no false correction from the noise", t.getFeedback().every((f) => f.good), `feedback: ${t.getFeedback().map((f) => f.voiceEn).join(", ")}`);
}
{
  // Old failure mode: a low-confidence far-side landmark teleports.
  const sm = createLandmarkSmoother();
  let t = 0, l = clone(base[200]);
  for (let i = 0; i < 30; i++) { sm.smooth(clone(base[200]), (t += DT)); }
  const good = sm.smooth(clone(base[200]), (t += DT))[26];
  l[26] = { x: 0.05, y: 0.05, z: 0, visibility: 0.1 };
  const held = sm.smooth(l, (t += DT))[26];
  check("Hidden joint (vis 0.1) is frozen, not teleported", Math.hypot(held.x - good.x, held.y - good.y) < 1e-6);
  // A genuine sustained move (even at modest visibility) must still be followed.
  let out;
  for (let i = 0; i < 12; i++) { l = clone(base[200]); l[26] = { x: good.x + 0.3, y: good.y, z: 0, visibility: 0.6 }; out = sm.smooth(l, (t += DT))[26]; }
  check("A genuine sustained move is still followed (glitch guard recovers)", out.x > good.x + 0.1, `moved ${(out.x - good.x).toFixed(2)} of 0.30`);
}

// ---------------------------------------------------------------- 4. wrong-form reps get the RIGHT cue
console.log("\n--- 4. Wrong-form reps (built from real frames) get the right cue ---\n");
{
  const half = firstAt(0.55);
  const low2 = runTracker(play([...oneRep(half)]));
  check("Half-height bridge counts as a rep AND says 'lift higher'", low2.getRepCount() === 1 && low2.getFeedback().includes(M.liftHipsHigher), `reps ${low2.getRepCount()}, cue: ${low2.getFeedback().map((f) => f.voiceEn).join(", ")}`);

  const mid = firstAt(0.55);
  const sag = runTracker(play([...range(0, TOP), ...range(TOP, mid), ...range(mid, TOP), ...range(TOP, 0)]));
  check("Hips sag mid-hold then recover -> 1 rep + 'hips up' cue", sag.getRepCount() === 1 && sag.getFeedback().includes(M.keepHipsUp), `reps ${sag.getRepCount()}, cue: ${sag.getFeedback().map((f) => f.voiceEn).join(", ")}`);

  const fast = runTracker(play(oneRep(), { speed: 4 }));
  check("Rep at 4x speed -> 1 rep + 'slower' cue", fast.getRepCount() === 1 && fast.getFeedback().includes(M.slowerRiseLower), `reps ${fast.getRepCount()}, cue: ${fast.getFeedback().map((f) => f.voiceEn).join(", ")}`);

  const slow = runTracker(play(oneRep(), { speed: 0.5 }));
  check("Slow, controlled rep (0.5x) -> no false 'slower' cue", slow.getRepCount() === 1 && slow.getFeedback().every((f) => f.good), `reps ${slow.getRepCount()}`);
}

// ---------------------------------------------------------------- 5. per-patient baseline + aspect ratio
console.log("\n--- 5. Per-patient baseline and aspect-ratio math ---\n");
{
  // Same movement, but this patient rests flatter (hip angle ~35 deg smaller offset): baseline must adapt.
  const sig = createHipExtensionSignal();
  let r;
  for (let i = 0; i < 40; i++) r = sig.process(base[i], { aspect: ASPECT });
  check("Resting angle is measured per patient, not assumed", r.calibrated && Math.abs(r.restAngle - 125) < 6, `measured rest ${r.restAngle.toFixed(1)} deg (clip rest 122-130)`);
  let lift;
  for (let i = 0; i < 6; i++) lift = sig.process(base[TOP], { aspect: ASPECT }); // median-of-5 needs a few frames to settle
  check("Full lift reads ~0-1 range top", lift.ext > 0.95, `ext ${lift.ext.toFixed(2)}, ${lift.angle.toFixed(0)} deg`);

  // A true 45 degree corner drawn on a 1280x720 frame: one leg horizontal, the other diagonal (equal pixel run and rise).
  const a = { x: 0.5, y: 0.5 }, b = { x: 0.5 + 200 / 1280, y: 0.5 }, c = { x: 0.5 + 200 / 1280, y: 0.5 + 200 / 720 };
  const wrong = angleAt(b, a, c), right = angleAtAspect(b, a, c, 1280 / 720);
  check("Aspect-corrected angle reads a true 45 deg as 45 (raw normalized math does not)", Math.abs(right - 45) < 0.5 && Math.abs(wrong - 45) > 5, `raw ${wrong.toFixed(1)} vs corrected ${right.toFixed(1)}`);
}

// ---------------------------------------------------------------- 6. pelvis + lower limb only
console.log("\n--- 6. Pelvis + lower limb only: head/shoulders/arms out of frame (phone close or held portrait) ---\n");
// The real clip with the upper body pushed beyond the picture edge, the way MediaPipe
// reports a body part that is cut off (position outside 0..1, low confidence).
const UPPER = [0, 11, 12, 13, 14, 15, 16]; // nose, shoulders, elbows, wrists
function maskUpper(lms, { vis = 0.15 } = {}) {
  const l = clone(lms);
  for (const j of UPPER) { l[j].x = 1.1; l[j].visibility = vis; }
  return l;
}
const maskFrames = (frames, opts) => frames.map(({ lms, t }) => ({ lms: maskUpper(lms, opts), t }));
const maskT = (l) => maskUpper(l);
const maskedBase = base.map((l) => maskUpper(l));
const maskedThree = maskFrames(threeReps);
const playM = (idx, opts) => maskFrames(play(idx, opts));

{
  // The reported bug, reproduced: everything from the pelvis down is in shot, only the head/shoulders are not.
  const seen = maskUpper(base[100], { vis: 0.6 }); // the model "believes" in the shoulder although it is outside the picture
  const whole = assessFraming(seen, { orientation: "side", region: "whole" });
  check("Whole-body rule says 'cut off' when only the head/shoulders are out of shot (the reported bug)", whole.status === "cut_off" && whole.cutOff.includes("shoulder"), `status ${whole.status}, missing: ${whole.cutOff.join(", ")}`);
  const lowerVerdict = assessFraming(seen, { orientation: "side", region: "lower", aspect: ASPECT });
  check("Pelvis + lower-limb rule accepts that very same frame", lowerVerdict.status === "ok", `status ${lowerVerdict.status}`);
  const unsure = assessFraming(maskUpper(base[100]), { orientation: "side", region: "whole" });
  check("...and with unconfident shoulders the whole-body rule can't find a person at all", unsure.status === "no_person", `status ${unsure.status}`);
}
{
  const q = createPoseQuality({ orientation: "side", region: "lower" });
  let spoke = 0, nonOk = 0, armedAt = null, t = 1000;
  for (const l of maskedBase) {
    const r = q.process(clone(l), t, { aspect: ASPECT });
    if (r.framing.speak) spoke++;
    if (r.framing.status !== "ok" && r.framing.status !== "initializing") nonOk++;
    if (r.armed && armedAt === null) armedAt = t - 1000;
    t += DT;
  }
  check("Lower-body framing: no 'move back' on the whole clip with the upper body out of frame", nonOk === 0 && spoke === 0, `problem frames ${nonOk}, voice prompts ${spoke}`);
  check("...and it arms within ~1 s", armedAt !== null && armedAt <= 1200, `armed after ${armedAt} ms`);
}
{
  const t = runTracker(maskedThree, { transform: maskT });
  check("Upper body out of frame: 3 correct reps -> exactly 3", t.getRepCount() === 3, `counted ${t.getRepCount()}`);
  check("...measured from the pelvis alone (no shoulder used)", t.getSignalReference() === "lowerBody", `signal '${t.getSignalReference()}'`);
  const raw = runTracker(maskedThree, { smooth: false, transform: maskT });
  check("...exactly 3 even with the smoother off", raw.getRepCount() === 3, `counted ${raw.getRepCount()}`);
  check("...and correct reps get no false correction", t.getFeedback().every((f) => f.good), `feedback: ${t.getFeedback().map((f) => f.voiceEn).join(", ")}`);
  const stats = t.getLastRepStats();
  check("...and a full-height lift reads as full height", stats && stats.peakExt >= 0.85, `peak ${stats && stats.peakExt.toFixed(2)}`);
  const idle = runTracker(maskFrames(play([...restHold(), ...restHold(), ...restHold()])), { transform: maskT });
  check("...lying still counts 0 reps", idle.getRepCount() === 0, `counted ${idle.getRepCount()}`);
}

// wrong-form reps with only the pelvis + lower limb visible
const extOfLower = (() => { const sig = createHipExtensionSignal(); return maskedBase.map((l) => sig.process(l, { aspect: ASPECT }).ext ?? 0); })();
const firstAtLower = (thr) => extOfLower.findIndex((e) => e >= thr);
{
  const half = firstAtLower(0.55);
  const low = runTracker(playM(oneRep(half)), { transform: maskT });
  check("Pelvis only: half-height bridge counts AND says 'lift higher'", low.getRepCount() === 1 && low.getFeedback().includes(M.liftHipsHigher), `reps ${low.getRepCount()}, cue: ${low.getFeedback().map((f) => f.voiceEn).join(", ")}`);
  // A clear sag: the hips drop to ~30% of the lift. (Smoothing rounds off a fast dip, so the depth the
  // tracker sees is well under the nominal one — a dip only just past the 25% detector threshold can
  // be caught by the shoulder-based angle and missed by the pelvis-only signal; a clear one is caught by both.)
  const low30 = firstAtLower(0.3);
  const sag = runTracker(playM([...range(0, TOP), ...range(TOP, low30), ...range(low30, TOP), ...range(TOP, 0)]), { transform: maskT });
  check("Pelvis only: hips sag clearly mid-hold then recover -> 1 rep + 'hips up'", sag.getRepCount() === 1 && sag.getFeedback().includes(M.keepHipsUp), `reps ${sag.getRepCount()}, cue: ${sag.getFeedback().map((f) => f.voiceEn).join(", ")}`);
  const fast = runTracker(playM(oneRep(), { speed: 4 }), { transform: maskT });
  check("Pelvis only: rep at 4x speed -> 1 rep + 'slower'", fast.getRepCount() === 1 && fast.getFeedback().includes(M.slowerRiseLower), `reps ${fast.getRepCount()}, cue: ${fast.getFeedback().map((f) => f.voiceEn).join(", ")}`);
  const slow = runTracker(playM(oneRep(), { speed: 0.5 }), { transform: maskT });
  check("Pelvis only: slow, controlled rep (0.5x) -> no false 'slower'", slow.getRepCount() === 1 && slow.getFeedback().every((f) => f.good), `reps ${slow.getRepCount()}`);
}
{
  const r = rng(11);
  const noisy = maskedThree.map(({ lms, t }) => {
    const out = clone(lms);
    for (const p of out) { p.x += gauss(r) * 0.006; p.y += gauss(r) * 0.006; }
    if (r() < 0.04) for (const j of [23, 25]) { out[j].x = r(); out[j].y = r(); out[j].visibility = 0.12; } // hip/knee "hallucinate"
    return { lms: out, t };
  });
  const t = runTracker(noisy, { transform: maskT });
  check("Pelvis only: heavy noise + 4% hallucinated hip/knee frames -> still exactly 3 reps", t.getRepCount() === 3, `counted ${t.getRepCount()}`);
  check("...and no false correction from the noise", t.getFeedback().every((f) => f.good), `feedback: ${t.getFeedback().map((f) => f.voiceEn).join(", ")}`);
}

// which signal is used, and switching
{
  const full = runTracker(threeReps);
  check("Whole body in frame: the validated shoulder-hip-knee angle is still what's used", full.getSignalReference() === "torso" && full.getRepCount() === 3, `signal '${full.getSignalReference()}', ${full.getRepCount()} reps`);
  const part1 = play([...oneRep(), ...restHold()]);
  const part2 = maskFrames(play([...restHold(), ...restHold(), ...oneRep(), ...restHold(), ...oneRep()], { t0: part1[part1.length - 1].t + DT }));
  const sw = runTracker([...part1, ...part2], { transform: maskT });
  check("Shoulder lost for good mid-session: switches to the pelvis signal and keeps counting", sw.getRepCount() === 3 && sw.getSignalReference() === "lowerBody", `${sw.getRepCount()} reps, signal '${sw.getSignalReference()}'`);
}

// phone on the floor: a lying body sits at the very bottom edge of the picture
{
  const floor = (l) => l.map((p) => ({ ...p, y: p.y + 0.19 }));
  const sample = floor(base[200]);
  const whole = assessFraming(sample, { orientation: "side", region: "whole" });
  const low = assessFraming(sample, { orientation: "side", region: "lower", aspect: ASPECT });
  check("Phone on the floor (body at the bottom edge): whole-body rule says 'cut off'", whole.status === "cut_off", `status ${whole.status}`);
  check("...pelvis + lower-limb rule doesn't (a joint sitting on the edge isn't cut off)", low.status === "ok", `status ${low.status}, lowest joint y ${Math.max(sample[27].y, sample[28].y).toFixed(3)}`);
  const t = runTracker(threeReps.map(({ lms, t }) => ({ lms: floor(lms), t })), { transform: floor });
  check("...and 3 reps still count from there", t.getRepCount() === 3, `counted ${t.getRepCount()}`);
}

// phone held portrait (9:16), person half the size, extra jitter
{
  const PORTRAIT = 0.5625;
  const toPortrait = (l, s = 0.5) => l.map((p) => ({ ...p, x: ((p.x * ASPECT - 0.4565) * s + PORTRAIT / 2) / PORTRAIT, y: (p.y - 0.65) * s + 0.5 }));
  const r = rng(3);
  const jitter = (l) => l.map((p) => ({ ...p, x: p.x + gauss(r) * 0.004, y: p.y + gauss(r) * 0.004 }));
  const verdict = assessFraming(toPortrait(maskUpper(base[200])), { orientation: "side", region: "lower", aspect: PORTRAIT });
  check("Portrait phone, person half the size: framing is fine (not 'too small' / 'cut off')", verdict.status === "ok", `status ${verdict.status}`);
  const frames = maskedThree.map(({ lms, t }) => ({ lms: jitter(toPortrait(lms)), t }));
  const t = runTracker(frames, { transform: (l) => jitter(toPortrait(maskUpper(l))), aspect: PORTRAIT });
  check("Portrait, half size, extra jitter, upper body out of frame: 3 correct reps -> exactly 3", t.getRepCount() === 3, `counted ${t.getRepCount()}`);
}

// the other framing verdicts still work in the lower region
{
  const tiny = clone(base[100]);
  for (const p of tiny) { p.x = 0.5 + (p.x - 0.5) * 0.35; p.y = 0.5 + (p.y - 0.5) * 0.35; }
  check("Lower-body framing: tiny person -> 'too_small' (move closer)", assessFraming(tiny, { orientation: "side", region: "lower", aspect: ASPECT }).status === "too_small");
  const dim = clone(base[100]);
  for (const [h, k, a] of [[23, 25, 27], [24, 26, 28]]) { dim[h].visibility = 0.5; dim[k].visibility = 0.3; dim[a].visibility = 0.1; }
  check("...legs seen but the model unsure -> 'low_confidence'", assessFraming(dim, { orientation: "side", region: "lower", aspect: ASPECT }).status === "low_confidence");
  check("...no pose -> 'no_person'", assessFraming(null, { orientation: "side", region: "lower" }).status === "no_person");

  const q = createPoseQuality({ orientation: "side", region: "lower" });
  let t = 1000, first = null, spoke = 0, missing = [];
  for (let i = 0; i < 1500; i++) { // 50 s with both feet really below the bottom edge
    const l = clone(base[100]);
    for (const j of [27, 28]) { l[j].y = 1.08; l[j].visibility = 0.2; }
    const r = q.process(l, t, { aspect: ASPECT });
    if (r.framing.status === "cut_off" && first === null) { first = t - 1000; missing = r.framing.cutOff; }
    if (r.framing.speak) spoke++;
    t += DT;
  }
  check("...feet really cut off IS reported (about 1.5 s in), naming the ankle", first !== null && first >= 1000 && first <= 2600 && missing.includes("ankle"), `reported after ${first} ms, missing: ${missing.join(", ")}`);
  check("...and the voice prompt is still capped (<= 3 in 50 s)", spoke >= 1 && spoke <= 3, `${spoke} prompts`);
}
{
  // Two sides that look nearly alike must not swap "near side" every frame.
  const q = createPoseQuality({ orientation: "side", region: "lower" });
  let t = 1000, flips = 0, prev = null;
  for (let i = 0; i < 120; i++) {
    const l = clone(base[100]);
    const a = i % 2 ? 0.85 : 0.8, b = i % 2 ? 0.8 : 0.85;
    for (const j of [23, 25, 27]) l[j].visibility = a;
    for (const j of [24, 26, 28]) l[j].visibility = b;
    const r = q.process(l, t, { aspect: ASPECT }); t += DT;
    if (prev && r.verdict.side !== prev) flips++;
    prev = r.verdict.side;
  }
  check("Near side does not flip-flop between two near-identical sides", flips <= 1, `${flips} flips in 120 frames`);
}
{
  const tr = createSingleLegBridgeTracker();
  let t = 1000;
  for (let i = 0; i < 60; i++) tr.processFrame(maskUpper(base[i]), (t += DT), { aspect: ASPECT });
  check("Single Leg Bridge, upper body out of frame: pelvis signal calibrates (smoke test only — no single-leg footage to validate counting)", tr.getStatusHint() === null, `hint: ${tr.getStatusHint()}`);
}

// ---------------------------------------------------------------- 7. countdown + the whole session pipeline
console.log("\n--- 7. \"Let's get started in 3, 2, 1\", and the whole session pipeline on real landmarks ---\n");
{
  const cd = createStartCountdown();
  const log = [];
  let t = 0, wentAt = null;
  const tick = (ready) => { const r = cd.update(ready, t); if (r.announce) log.push(`${r.announce}:${r.number}@${t}`); if (r.justFinished) wentAt = t; t += 50; return r; };
  for (let i = 0; i < 20; i++) tick(false); // 1 s: setup not good yet
  check("Countdown stays silent until the setup is good", log.length === 0 && wentAt === null);
  for (let i = 0; i < 120; i++) tick(true);
  check("Says 'Let's get started in 3', then 2, then 1, then Go 3.4 s after the setup is good", log.join(" ") === "start:3@1000 tick:2@2400 tick:1@3400" && wentAt === 4400, `${log.join(" ")}  Go @${wentAt}`);
}
{
  const cd = createStartCountdown();
  let t = 0; const starts = [];
  const tick = (ready) => { const r = cd.update(ready, t); if (r.announce === "start") starts.push(t); t += 50; return r; };
  for (let i = 0; i < 30; i++) tick(true);  // 1.5 s in
  for (let i = 0; i < 6; i++) tick(false);  // setup lost
  let r; for (let i = 0; i < 200; i++) r = tick(true);
  check("Setup lost mid-countdown -> starts over from 3 (nobody is counted in unseen)", starts.length === 2 && r.phase === "done", `starts at ${starts.join(", ")} ms`);
  const a = cd.update(false, t + 10), b = cd.update(true, t + 20);
  check("Once finished it stays finished (never counts down twice)", a.phase === "done" && b.phase === "done" && !b.justFinished);
}
{
  let reps = 0, resets = 0;
  const stub = () => ({ processFrame() {}, getRepCount: () => reps, getFeedback: () => [M.goodBridgeHeight], getStatusHint: () => null, reset() { resets++; reps = 0; } });
  const s = createLiveSession({ trackerFactory: stub, orientation: "side", region: "lower" });
  let t = 1000, goAt = null, repBeforeGo = false;
  for (let i = 0; i < 200; i++) {
    if (i === 60) reps = 1; // a rep the tracker "sees" while the countdown is still running
    const out = s.process(clone(base[100]), t, { aspect: ASPECT }); t += DT;
    for (const ev of out.events) { if (ev.type === "go") goAt = t; if (ev.type === "rep" && goAt === null) repBeforeGo = true; }
  }
  check("A rep made during the countdown is not counted or announced; the tracker starts clean at Go", resets === 1 && !repBeforeGo && goAt !== null, `tracker resets: ${resets}`);
}

/** Drive the exact pipeline the screen uses, from a cold start, and log what it would say/show. */
function runSession(frames, { region, target = 3, aspect = ASPECT } = {}) {
  const s = createLiveSession({ trackerFactory: createGluteBridgeTracker, orientation: "side", region, targetReps: target });
  const log = { events: [], armedAt: null, goAt: null, finishedAt: null, reps: 0, phases: new Set() };
  const t0 = frames[0].t;
  for (const f of frames) {
    const out = s.process(clone(f.lms), f.t, { aspect });
    if (out.armed && log.armedAt === null) log.armedAt = f.t - t0;
    out.started ? log.phases.add("live") : out.countdown !== null ? log.phases.add("countdown") : log.phases.add("positioning");
    for (const ev of out.events) { log.events.push(ev); if (ev.type === "go") log.goAt = f.t - t0; }
    log.reps = out.reps;
    if (out.finished) { log.finishedAt = f.t - t0; break; }
  }
  return log;
}
{
  // ~7 s lying still (room for the countdown), then 3 reps — with the head/shoulders out of frame.
  const restLoop = [...range(0, 110), ...range(0, 110)];
  const idx = [...restLoop, ...oneRep(), ...restHold(), ...oneRep(), ...restHold(), ...oneRep(), ...restHold()];
  const lowerRun = runSession(maskFrames(play(idx)), { region: "lower" });
  const seq = lowerRun.events.filter((e) => e.type !== "framing").map((e) => e.type === "countdown" ? `${e.announce}:${e.number}` : e.type === "rep" ? `rep${e.count}` : e.type);
  check("Pelvis + lower limb only: says 3, 2, 1, Go, then counts rep 1, 2, 3", seq.join(" ") === "start:3 tick:2 tick:1 go rep1 rep2 rep3", seq.join(" "));
  check("...starts counting ~4 s after the camera first sees a good setup", lowerRun.goAt !== null && lowerRun.goAt >= 3700 && lowerRun.goAt <= 4300, `Go at ${lowerRun.goAt} ms`);
  check("...finishes at exactly the target, with no 'move back' at any point", lowerRun.reps === 3 && lowerRun.finishedAt !== null && !lowerRun.events.some((e) => e.type === "framing"), `${lowerRun.reps} reps, ${lowerRun.events.filter((e) => e.type === "framing").length} framing prompts`);
  check("...and passes through positioning -> countdown -> live", ["positioning", "countdown", "live"].every((p) => lowerRun.phases.has(p)), [...lowerRun.phases].join(", "));

  // Same footage under the old whole-body rule: the reported behaviour.
  const wholeRun = runSession(maskFrames(play(idx), { vis: 0.6 }), { region: "whole" });
  const nags = wholeRun.events.filter((e) => e.type === "framing" && e.status === "cut_off").length;
  check("Same footage under the whole-body rule: never starts and nags 'move back' (the reported bug)", wholeRun.armedAt === null && wholeRun.reps === 0 && nags >= 1, `armed: ${wholeRun.armedAt}, reps ${wholeRun.reps}, 'move back' prompts ${nags}`);

  // Fully visible person: still starts with the countdown, still counts, still uses the validated angle.
  const fullRun = runSession(play(idx), { region: "lower" });
  check("Whole body in frame, pelvis+lower-limb rule: same countdown, same 3 reps", fullRun.reps === 3 && fullRun.goAt !== null && fullRun.goAt <= 4300, `${fullRun.reps} reps, Go at ${fullRun.goAt} ms`);
}

// ---------------------------------------------------------------- 8. reported bug: a deliberate leg lift can't corrupt tracking
console.log("\n--- 8. Reported bug: deliberately lifting the OTHER leg mid-session doesn't corrupt tracking ---\n");
{
  // Signal level: near side locks once calibrated, and stays locked through a
  // big, sustained visibility swing on the other side (the signature of a
  // deliberate leg lift — the lifted leg becomes far more visible/prominent).
  for (const [name, make] of [
    ["hipExtensionSignal (torso reference)", () => createHipExtensionSignal()],
    ["pelvicLiftSignal", () => createPelvicLiftSignal()],
  ]) {
    const sig = make();
    for (let i = 0; i < 40; i++) sig.process(clone(base[0]), { aspect: ASPECT }); // calibrate at rest
    check(`${name}: calibrates`, sig.isCalibrated());
    const before = sig.process(clone(base[0]), { aspect: ASPECT }).side;
    const otherIdx = before === "left" ? [12, 24, 26] : [11, 23, 25];
    for (let i = 0; i < 90; i++) { // ~3 s
      const l = clone(base[0]);
      for (const j of otherIdx) l[j].visibility = 1.0;
      sig.process(l, { aspect: ASPECT });
    }
    const after = sig.process(clone(base[0]), { aspect: ASPECT }).side;
    check(`${name}: near side stays locked through the swing`, after === before, `was ${before}, now ${after}`);
  }
}
{
  // Tracker level, end to end: 2 correct reps, then lift the OTHER leg toward
  // the camera for ~2 s (boosted visibility AND moved to a "raised" position)
  // while the TRACKED leg stays exactly at rest throughout, then 2 more
  // correct reps. This is the exact scenario reported: deliberately lifting a
  // leg, then good reps stop being counted for the rest of the session.
  const tracker = createGluteBridgeTracker();
  const sm = createLandmarkSmoother();
  let t = 1000;
  const feed = (lms) => { tracker.processFrame(sm.smooth(lms, t), t, { aspect: ASPECT }); t += DT; };

  for (let i = 0; i < 40; i++) feed(clone(base[0])); // settle + calibrate
  const sideBefore = tracker.getSide();

  for (const i of oneRep()) feed(clone(base[i]));
  for (let i = 0; i < 20; i++) feed(clone(base[0]));
  for (const i of oneRep()) feed(clone(base[i]));
  for (let i = 0; i < 20; i++) feed(clone(base[0]));
  check("2 correct reps count normally before the leg lift", tracker.getRepCount() === 2, `counted ${tracker.getRepCount()}`);

  const otherSide = sideBefore === "right" ? "left" : "right";
  const otherIdx = otherSide === "left" ? { sh: 11, hip: 23, knee: 25, ank: 27 } : { sh: 12, hip: 24, knee: 26, ank: 28 };
  const top = base[TOP];
  const lifted = () => {
    const l = clone(base[0]); // tracked leg stays exactly at rest throughout
    for (const key of ["sh", "hip", "knee", "ank"]) { const j = otherIdx[key]; l[j] = { ...top[j], visibility: 1.0 }; }
    return l;
  };
  for (let i = 0; i < 60; i++) feed(lifted()); // ~2 s of the other leg raised and highly visible

  check("Near side is unchanged after the disturbance", tracker.getSide() === sideBefore, `was ${sideBefore}, now ${tracker.getSide()}`);
  check("The disturbance itself is not counted as a rep (still reading the resting tracked leg)", tracker.getRepCount() === 2, `counted ${tracker.getRepCount()}`);

  for (const i of oneRep()) feed(clone(base[i]));
  for (let i = 0; i < 20; i++) feed(clone(base[0]));
  for (const i of oneRep()) feed(clone(base[i]));
  for (let i = 0; i < 30; i++) feed(clone(base[0]));
  check("Counting resumes after the disturbance: 4 of 4 reps counted, none lost", tracker.getRepCount() === 4, `counted ${tracker.getRepCount()}`);
}

// ---------------------------------------------------------------- 9. deliberately lifting a leg gets a real correction
console.log("\n--- 9. Deliberately lifting a leg during Glute Bridge gets a real correction, not silence ---\n");
{
  // Move ONLY the near-side ankle to set the hip-knee-ankle angle to an exact
  // value (deg), leaving hip/knee/shoulder (what the hip-extension signal
  // reads) untouched, so the rep itself still looks completely normal.
  function setKneeAngle(frame, side, targetDeg) {
    const l = clone(frame);
    const idx = side === "left" ? { hip: 23, knee: 25, ankle: 27 } : { hip: 24, knee: 26, ankle: 28 };
    const A = ASPECT, hip = l[idx.hip], knee = l[idx.knee], ankle = l[idx.ankle];
    const kx = knee.x * A, ky = knee.y, hx = hip.x * A, hy = hip.y, ax = ankle.x * A, ay = ankle.y;
    const shinLen = Math.hypot(ax - kx, ay - ky);
    const hipDist = Math.hypot(hx - kx, hy - ky);
    const ux = (hx - kx) / hipDist, uy = (hy - ky) / hipDist; // unit vector knee -> hip
    const theta = (targetDeg * Math.PI) / 180;
    const rot = (ang) => ({ x: ux * Math.cos(ang) - uy * Math.sin(ang), y: ux * Math.sin(ang) + uy * Math.cos(ang) });
    let d = rot(theta);
    if (ky + d.y * shinLen < ky) d = rot(-theta); // keep the foot below the knee, for a plausible-looking picture
    l[idx.ankle] = { ...ankle, x: (kx + d.x * shinLen) / A, y: ky + d.y * shinLen };
    return l;
  }

  const tracker = createGluteBridgeTracker();
  const sm = createLandmarkSmoother();
  let t = 1000;
  const feed = (lms) => { tracker.processFrame(sm.smooth(lms, t), t, { aspect: ASPECT }); t += DT; };
  for (let i = 0; i < 40; i++) feed(clone(base[0]));
  const side = tracker.getSide();

  // A normal-looking rep, but the knee straightens ~50 deg past its own start
  // once the hips are up — a leg lifting/extending, not a two-leg bridge.
  const idx = oneRep();
  for (const i of idx) {
    const straighten = i > TOP * 0.6; // once well into the lift
    feed(straighten ? setKneeAngle(base[i], side, 100) : clone(base[i]));
  }
  for (let i = 0; i < 30; i++) feed(clone(base[0]));

  check("A lifted-leg rep still counts (the hips genuinely rose)", tracker.getRepCount() === 1, `counted ${tracker.getRepCount()}`);
  check("...and gets 'keep your knee bent', not 'Good'", tracker.getFeedback().includes(M.keepKneeBent) && !tracker.getFeedback().some((f) => f.good), `feedback: ${tracker.getFeedback().map((f) => f.voiceEn).join(", ")}`);

  // Control: the SAME rep with no knee override must not false-positive.
  const clean = createGluteBridgeTracker();
  let t2 = 1000;
  const feed2 = (lms) => { clean.processFrame(sm.smooth(lms, t2), t2, { aspect: ASPECT }); t2 += DT; };
  for (let i = 0; i < 40; i++) feed2(clone(base[0]));
  for (const i of idx) feed2(clone(base[i]));
  for (let i = 0; i < 30; i++) feed2(clone(base[0]));
  check("A genuine correct-form rep never gets 'keep your knee bent'", !clean.getFeedback().includes(M.keepKneeBent), `feedback: ${clean.getFeedback().map((f) => f.voiceEn).join(", ")}`);
}

// ---------------------------------------------------------------- 10. repCounter self-heal watchdog
console.log("\n--- 10. repCounter: if a signal ever got stuck 'active', the counter self-heals ---\n");
{
  const rc = createRepCounter({ enter: 0.5, exit: 0.15, minPeak: 0.5, stuckAfterMs: 5000 });
  let t = 0;
  rc.update(0.9, t);
  check("Enters active on a signal above ENTER", rc.isActive());
  t += 5001; // a signal that never returns, for far longer than any real rep takes
  const duringStuck = rc.update(0.9, t);
  check("Past the stuck threshold: abandons the attempt (no rep credited), back to idle", !rc.isActive() && !duringStuck && rc.getRepCount() === 0, `active=${rc.isActive()}, credited=${duringStuck}, reps=${rc.getRepCount()}`);

  rc.update(0.9, (t += 10)); // a genuine rep right after
  rc.update(0.1, (t += 400));
  const completed = rc.update(0.1, (t += 250)); // clears the 200ms exit debounce
  check("A genuine rep right after the recovery is still counted", completed && rc.getRepCount() === 1, `completed=${completed}, reps=${rc.getRepCount()}`);
}
{
  // The default (45 s) must never cut off a legitimate slow, controlled rep.
  const rc = createRepCounter({ enter: 0.5, exit: 0.15, minPeak: 0.5 });
  let t = 0;
  rc.update(0.9, t);
  t += 40000; // 40 s into a very slow held rep — still well under the 45 s default
  rc.update(0.9, t);
  check("Default watchdog (45 s) doesn't touch a 40 s slow rep", rc.isActive(), `active after 40s: ${rc.isActive()}`);
  rc.update(0.1, (t += 10)); // crosses below EXIT, starts the exit debounce
  const completed = rc.update(0.1, (t += 250)); // debounce clears -> finalizes
  check("...and it still completes normally when the patient finally returns", completed && rc.getRepCount() === 1, `completed=${completed}, reps=${rc.getRepCount()}`);
}

const failed = results.filter((r) => !r).length;
console.log(`\n${failed === 0 ? `All ${results.length} reliability checks passed.` : `${failed} of ${results.length} reliability checks FAILED.`}\n`);
process.exit(failed === 0 ? 0 : 1);
