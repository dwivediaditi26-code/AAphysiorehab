// Verification harness, not part of the app — feeds each tracker a synthetic
// "one clean rep" landmark sequence and checks it counts correctly. Run with:
//   node test-trackers.mjs
import { createDeadBugTracker } from "./src/lib/deadBugTracker.js";
import { createGluteBridgeTracker } from "./src/lib/gluteBridgeTracker.js";
import { createBirdDogTracker } from "./src/lib/birdDogTracker.js";
import { createSingleLegBridgeTracker } from "./src/lib/singleLegBridgeTracker.js";
import { createSquatTracker } from "./src/lib/squatTracker.js";
import { createSitToStandTracker } from "./src/lib/sitToStandTracker.js";
import { createHeelRaiseTracker } from "./src/lib/heelRaiseTracker.js";
import { createShoulderAbductionTracker } from "./src/lib/shoulderAbductionTracker.js";
import { createHipAbductionTracker } from "./src/lib/hipAbductionTracker.js";
import { createSupermanTracker } from "./src/lib/supermanTracker.js";
import { createPronePressUpTracker } from "./src/lib/pronePressUpTracker.js";
import { createSideLyingLegRaiseTracker } from "./src/lib/sideLyingLegRaiseTracker.js";
import { createSidePlankTracker } from "./src/lib/sidePlankTracker.js";
import { createFrontPlankTracker } from "./src/lib/frontPlankTracker.js";
import { createAdductorSqueezeTracker } from "./src/lib/adductorSqueezeTracker.js";

function lm(overrides = {}) {
  // 33 default landmarks in a neutral standing/lying pose, all high visibility.
  const base = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0, visibility: 0.95 }));
  const defaults = {
    11: { x: 0.4, y: 0.3 }, 12: { x: 0.6, y: 0.3 },   // shoulders
    13: { x: 0.38, y: 0.4 }, 14: { x: 0.62, y: 0.4 }, // elbows
    15: { x: 0.4, y: 0.15 }, 16: { x: 0.6, y: 0.15 }, // wrists (arms up)
    23: { x: 0.42, y: 0.6 }, 24: { x: 0.58, y: 0.6 }, // hips
    25: { x: 0.42, y: 0.75 }, 26: { x: 0.58, y: 0.75 }, // knees
    27: { x: 0.42, y: 0.9 }, 28: { x: 0.58, y: 0.9 },  // ankles
    29: { x: 0.42, y: 0.92 }, 30: { x: 0.58, y: 0.92 }, // heels
    31: { x: 0.45, y: 0.92 }, 32: { x: 0.55, y: 0.92 }, // toes
  };
  for (const [i, p] of Object.entries(defaults)) base[i] = { ...base[i], ...p };
  for (const [i, p] of Object.entries(overrides)) base[i] = { ...base[i], ...p };
  return base;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function triangle(t) { return t < 0.5 ? t / 0.5 : (1 - t) / 0.5; } // 0 -> 1 -> 0
const deg = (d) => (d * Math.PI) / 180;

/** Point at `angleDeg` around `vertex`, distance `r`. Pure geometry — lets a
 * test target an exact angleAt() reading regardless of which way is "up" in
 * a lying-down vs standing pose (easy to get backwards from intuition alone). */
function pointAt(vertex, angleDeg, r) {
  return { x: vertex.x + r * Math.cos(deg(angleDeg)), y: vertex.y + r * Math.sin(deg(angleDeg)) };
}

function runSequence(tracker, frameFn, frames = 80) {
  for (let i = 0; i < frames; i++) {
    tracker.processFrame(frameFn(i / (frames - 1)), Date.now() + i * 16);
  }
  return tracker.getRepCount();
}

const results = [];

function test(name, fn) {
  try {
    const count = fn();
    results.push({ name, count, ok: count >= 1 });
  } catch (err) {
    results.push({ name, error: err.message, ok: false });
  }
}

// Dead Bug: left wrist lowers past shoulder toward hip level (norm 0->1),
// right ankle extends away from hip (norm 0->1) — exact formula from
// deadBugTracker.js's extensionFor(), not a guessed "realistic" pose.
test("Dead Bug (deadBugTracker.js)", () => {
  const tracker = createDeadBugTracker();
  const shoulderY = 0.3, hipY = 0.6, torsoLen = hipY - shoulderY;
  return runSequence(tracker, (t) => {
    const p = triangle(t);
    return lm({
      11: { y: shoulderY }, 12: { y: shoulderY },
      23: { y: hipY }, 24: { y: hipY },
      15: { y: lerp(shoulderY - 0.2, hipY, p) },           // left wrist: above shoulder -> at hip level
      28: { y: hipY + lerp(0, torsoLen * 0.9, p) },        // right ankle: at hip -> extended away
    });
  }, 220);
});

// Glute Bridge: shoulder-hip-knee angle opens from bent (110°, rest) to
// straight (170°, peak) — exact target angles via pointAt(), guaranteed
// correct regardless of lying-down spatial intuition.
test("Glute Bridge (gluteBridgeTracker.js)", () => {
  const tracker = createGluteBridgeTracker();
  return runSequence(tracker, (t) => {
    const angle = lerp(100, 175, triangle(t));
    const hip = { x: 0.5, y: 0.5 };
    const shoulder = pointAt(hip, 200, 0.25);
    const knee = pointAt(hip, 200 - angle, 0.2);
    return lm({
      11: shoulder, 12: shoulder,
      23: hip, 24: hip,
      25: knee, 26: knee,
    });
  }, 220);
});

// Bird Dog: left wrist reaches away from shoulder, right ankle reaches away
// from hip (Euclidean distance, per birdDogTracker.js's extensionFor).
test("Bird Dog (birdDogTracker.js)", () => {
  const tracker = createBirdDogTracker();
  const shoulder = { x: 0.4, y: 0.3 }, hip = { x: 0.42, y: 0.6 };
  const torsoLen = hip.y - shoulder.y;
  return runSequence(tracker, (t) => {
    const p = triangle(t);
    const reach = torsoLen * 0.9 * p;
    return lm({
      11: shoulder, 12: shoulder,
      23: hip, 24: hip,
      15: { x: shoulder.x + reach, y: shoulder.y },
      28: { x: hip.x + reach, y: hip.y },
    });
  }, 220);
});

// Single Leg Bridge: same hip-extension angle as Glute Bridge, plus one knee
// (right, straight ~170°) meaningfully straighter than the other (left, bent
// ~90°) at peak — the asymmetry gate singleLegBridgeTracker.js requires to
// count a rep as "single leg" rather than a two-leg bridge.
test("Single Leg Bridge (singleLegBridgeTracker.js)", () => {
  const tracker = createSingleLegBridgeTracker();
  return runSequence(tracker, (t) => {
    const p = triangle(t);
    const hipAngle = lerp(100, 175, p);
    const hip = { x: 0.5, y: 0.5 };
    const shoulder = pointAt(hip, 200, 0.25);
    const knee = pointAt(hip, 200 - hipAngle, 0.2);
    const leftKnee = { x: 0.45, y: 0.45 };
    const leftAnkle = pointAt(leftKnee, 260, 0.15); // ~90 deg bent, stays constant
    const rightKnee = knee;
    const rightAnkle = pointAt(rightKnee, 200 - lerp(90, 175, p), 0.2); // straightens with the lift
    return lm({
      11: shoulder, 12: shoulder,
      23: hip, 24: hip,
      25: leftKnee, 26: rightKnee,
      27: leftAnkle, 28: rightAnkle,
    });
  }, 220);
});

// Squat: knee angle closes from standing (~170) to squat depth (~90) and back.
test("Squat (squatTracker.js)", () => {
  const tracker = createSquatTracker();
  return runSequence(tracker, (t) => {
    const angle = lerp(170, 85, triangle(t));
    const knee = { x: 0.5, y: 0.75 };
    const hip = pointAt(knee, 260, 0.2);
    const ankle = pointAt(knee, 260 - angle, 0.2);
    return lm({ 11: { y: hip.y - 0.3 }, 12: { y: hip.y - 0.3 }, 23: hip, 24: hip, 25: knee, 26: knee, 27: ankle, 28: ankle });
  }, 220);
});

// Sit-to-Stand: knee angle opens from seated (~90) to standing (~170).
test("Sit-to-Stand (sitToStandTracker.js)", () => {
  const tracker = createSitToStandTracker();
  return runSequence(tracker, (t) => {
    const angle = lerp(85, 170, triangle(t));
    const knee = { x: 0.5, y: 0.75 };
    const hip = pointAt(knee, 260, 0.2);
    const ankle = pointAt(knee, 260 - angle, 0.2);
    return lm({ 23: hip, 24: hip, 25: knee, 26: knee, 27: ankle, 28: ankle });
  }, 220);
});

// Heel Raises: toe-heel vertical gap grows as heels lift.
test("Heel Raises (heelRaiseTracker.js)", () => {
  const tracker = createHeelRaiseTracker();
  return runSequence(tracker, (t) => {
    const p = triangle(t);
    return lm({ 29: { y: lerp(0.92, 0.86, p) }, 30: { y: lerp(0.92, 0.86, p) } });
  }, 220);
});

// Shoulder Abduction: both wrists move outward from shoulders, then return.
test("Shoulder Abduction (shoulderAbductionTracker.js)", () => {
  const tracker = createShoulderAbductionTracker();
  return runSequence(tracker, (t) => {
    const p = triangle(t);
    return lm({
      15: { x: lerp(0.4, 0.1, p) },
      16: { x: lerp(0.6, 0.9, p) },
    });
  }, 220);
});

// Standing Hip Abduction: right ankle moves away from hip midline after a
// calibration window at rest, left knee stays straighter (gate).
test("Standing Hip Abduction (hipAbductionTracker.js)", () => {
  const tracker = createHipAbductionTracker();
  return runSequence(tracker, (t) => {
    if (t < 0.15) return lm(); // calibration frames at rest
    const p = triangle((t - 0.15) / 0.85);
    return lm({ 28: { x: lerp(0.58, 0.85, p) } });
  }, 240);
});

// Superman: shoulders and ankles both rise off the floor together, after a
// calibration window at rest.
test("Superman (supermanTracker.js)", () => {
  const tracker = createSupermanTracker();
  return runSequence(tracker, (t) => {
    if (t < 0.12) return lm(); // calibration frames at rest
    const p = triangle((t - 0.12) / 0.88);
    return lm({
      11: { y: lerp(0.3, 0.15, p) }, 12: { y: lerp(0.3, 0.15, p) },
      27: { y: lerp(0.9, 0.75, p) }, 28: { y: lerp(0.9, 0.75, p) },
    });
  }, 260);
});

// Prone Press-Up: shoulders rise, hips stay near baseline (unlike Superman).
test("Prone Press-Up (pronePressUpTracker.js)", () => {
  const tracker = createPronePressUpTracker();
  return runSequence(tracker, (t) => {
    if (t < 0.12) return lm();
    const p = triangle((t - 0.12) / 0.88);
    return lm({ 11: { y: lerp(0.3, 0.1, p) }, 12: { y: lerp(0.3, 0.1, p) } });
  }, 260);
});

// Side-Lying Leg Raise: left ankle lifts relative to its calibrated baseline
// (image-vertical, camera upright to the side of the mat), right ankle stays put.
test("Side-Lying Leg Raise (sideLyingLegRaiseTracker.js)", () => {
  const tracker = createSideLyingLegRaiseTracker();
  return runSequence(tracker, (t) => {
    if (t < 0.15) return lm();
    const p = triangle((t - 0.15) / 0.85);
    return lm({ 27: { y: lerp(0.9, 0.65, p) } });
  }, 260);
});

console.log("\n--- Tracker verification (synthetic movement, one clean rep) ---\n");
let allOk = true;
for (const r of results) {
  const status = r.ok ? "PASS" : "FAIL";
  if (!r.ok) allOk = false;
  console.log(`${status}  ${r.name}  →  reps counted: ${r.error ? "ERROR: " + r.error : r.count}`);
}
console.log(`\n${allOk ? `All ${results.length} trackers counted at least 1 rep from a clean synthetic movement.` : "One or more trackers failed — see above."}\n`);
let overallOk = allOk;

// Direct regression test for the reported bug: a real rep with a brief noisy
// dip toward EXIT mid-hold (simulating landmark jitter) should still count
// as exactly 1 rep, not 2 — this is what EXIT_DEBOUNCE_FRAMES in
// repCounter.js is specifically for.
console.log("--- Jitter regression: one rep with a noisy mid-hold dip — expect exactly 1, not 2 ---\n");
test("Glute Bridge with jitter (gluteBridgeTracker.js)", () => {
  const tracker = createGluteBridgeTracker();
  const hip = { x: 0.5, y: 0.5 };
  const shoulder = pointAt(hip, 200, 0.25);
  return runSequence(tracker, (t) => {
    // Rise to peak (0 -> 0.3), hold with a brief noisy dip toward rest around
    // the midpoint of the hold (0.3 -> 0.5), then finish the hold and return
    // (0.5 -> 1.0). One continuous physical rep, not two.
    let angle;
    if (t < 0.3) angle = lerp(100, 175, t / 0.3);
    else if (t < 0.35) angle = lerp(175, 112, (t - 0.3) / 0.05); // brief jitter dip, genuinely below EXIT (125°)
    else if (t < 0.5) angle = lerp(112, 175, (t - 0.35) / 0.15); // recovers, still holding
    else angle = lerp(175, 100, (t - 0.5) / 0.5); // real return
    const knee = pointAt(hip, 200 - angle, 0.2);
    return lm({ 11: shoulder, 12: shoulder, 23: hip, 24: hip, 25: knee, 26: knee });
  }, 280);
});
const jitterResult = results[results.length - 1];
const jitterOk = jitterResult.count === 1;
console.log(`${jitterOk ? "PASS" : "FAIL"}  ${jitterResult.name}  →  reps counted: ${jitterResult.count} (expected exactly 1)`);
console.log(`\n${jitterOk ? "Jitter did not cause a double-count." : "REGRESSION: jitter caused a double-count."}\n`);
overallOk = overallOk && jitterOk;

// Negative control: static pose, zero movement — every tracker should report 0.
console.log("--- Negative control: static pose (no movement) — expect 0 reps for all ---\n");
const staticTests = [
  ["Dead Bug", createDeadBugTracker],
  ["Glute Bridge", createGluteBridgeTracker],
  ["Bird Dog", createBirdDogTracker],
  ["Single Leg Bridge", createSingleLegBridgeTracker],
  ["Squat", createSquatTracker],
  ["Sit-to-Stand", createSitToStandTracker],
  ["Heel Raises", createHeelRaiseTracker],
  ["Shoulder Abduction", createShoulderAbductionTracker],
  ["Standing Hip Abduction", createHipAbductionTracker],
  ["Superman", createSupermanTracker],
  ["Prone Press-Up", createPronePressUpTracker],
  ["Side-Lying Leg Raise", createSideLyingLegRaiseTracker],
];
let staticOk = true;
for (const [name, factory] of staticTests) {
  const tracker = factory();
  for (let i = 0; i < 100; i++) tracker.processFrame(lm(), Date.now() + i * 16);
  const count = tracker.getRepCount();
  if (count !== 0) staticOk = false;
  console.log(`${count === 0 ? "PASS" : "FAIL"}  ${name}  →  reps counted at rest: ${count}`);
}
console.log(`\n${staticOk ? "No false reps counted from a static pose." : "One or more trackers counted reps with zero movement — false positive."}\n`);
overallOk = overallOk && staticOk;

// Hold-tracker verification: a different engine (holdCounter.js), a
// different failure mode to check for. Uses a short test targetMs (500ms)
// rather than each exercise's real target (10-20s) so the simulated
// timeline doesn't need thousands of frames — the engine's logic doesn't
// care what the target duration actually is.
console.log("--- Hold trackers: successful hold (stay in position past target) — expect 1 completed hold ---\n");
const holdTests = [
  ["Side Plank", createSidePlankTracker, (p) => lm({ 23: { y: lerp(0.6, 0.62 - p * 0.15, 1) }, 24: { y: lerp(0.6, 0.62 - p * 0.15, 1) } })],
  ["Front Plank", createFrontPlankTracker, (p) => lm({ 23: { y: 0.6 - p * 0.15 }, 24: { y: 0.6 - p * 0.15 } })],
  ["Adductor Squeeze", createAdductorSqueezeTracker, (p) => lm({ 25: { x: 0.42 + p * 0.08 }, 26: { x: 0.58 - p * 0.08 } })],
];

function runHoldSequence(tracker, poseAtProgress, frames, holdFromFrame) {
  for (let i = 0; i < frames; i++) {
    const now = Date.now() + i * 16;
    const inPosition = i >= holdFromFrame;
    tracker.processFrame(poseAtProgress(inPosition ? 1 : 0), now);
  }
  return tracker.getCompletedHolds();
}

let holdOk = true;
for (const [name, factory, poseAtProgress] of holdTests) {
  const tracker = factory({ targetMs: 500 });
  // 15 calibration frames at rest, then hold the "in position" pose for
  // 60 frames (~960ms of simulated time — comfortably past the 500ms target).
  const count = runHoldSequence(tracker, poseAtProgress, 75, 15);
  const ok = count === 1;
  if (!ok) holdOk = false;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  →  completed holds: ${count} (expected 1)`);
}
console.log(`\n${holdOk ? "All hold trackers completed a genuine sustained hold." : "One or more hold trackers failed — see above."}\n`);
overallOk = overallOk && holdOk;

console.log("--- Hold trackers: broken early (drop out before target) — expect 0 completed holds ---\n");
let breakOk = true;
for (const [name, factory, poseAtProgress] of holdTests) {
  const tracker = factory({ targetMs: 500 });
  // Calibrate, hold briefly (200ms — under the 500ms target), then drop back
  // to rest for the remainder. Should never complete.
  for (let i = 0; i < 90; i++) {
    const now = Date.now() + i * 16;
    const inPosition = i >= 15 && i < 28; // ~13 frames in position, ~208ms — short of target
    tracker.processFrame(poseAtProgress(inPosition ? 1 : 0), now);
  }
  const count = tracker.getCompletedHolds();
  const ok = count === 0;
  if (!ok) breakOk = false;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  →  completed holds: ${count} (expected 0 — broke before target)`);
}
console.log(`\n${breakOk ? "Breaking position early correctly did not count as a completed hold." : "REGRESSION: a broken hold still counted."}\n`);
overallOk = overallOk && breakOk;

process.exit(overallOk ? 0 : 1);
