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

function runTracker(frames, { smooth = true, trackerConfig } = {}) {
  const tracker = createGluteBridgeTracker(trackerConfig);
  const sm = createLandmarkSmoother();
  let t = 0;
  for (const f of frames) {
    const lms = smooth ? sm.smooth(f.lms, f.t) : f.lms;
    tracker.processFrame(lms, f.t, { aspect: ASPECT });
    t = f.t;
  }
  // settle at rest so the last rep can finalize (debounce)
  for (let i = 0; i < 30; i++) {
    t += DT;
    const lms = smooth ? sm.smooth(clone(base[0]), t) : clone(base[0]);
    tracker.processFrame(lms, t, { aspect: ASPECT });
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

const failed = results.filter((r) => !r).length;
console.log(`\n${failed === 0 ? `All ${results.length} reliability checks passed.` : `${failed} of ${results.length} reliability checks FAILED.`}\n`);
process.exit(failed === 0 ? 0 : 1);
