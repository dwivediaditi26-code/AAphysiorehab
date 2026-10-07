// Single source of truth for "which exercises actually have a working camera
// tracker" — shared by the patient exercise flow (to route to the real
// tracking screen) and the therapist exercise library (to show an accurate
// badge instead of the aspirational `ex.tracking` flag, which just means
// "clinically suitable for tracking one day" and does NOT mean a tracker
// exists yet).
//
// Camera orientation is exercise-position-dependent, confirmed: standing
// exercises use a FRONTAL camera (patient faces it); exercises done lying
// down keep the original SIDE-ON view. That flips which movements are
// trackable for standing exercises specifically — sideways motion
// (abduction) became reliable, forward motion (flexion, hinging) became
// unreliable, since a frontal camera barely sees depth. hipHingeTracker.js
// still exists (someone might use a side camera for it specifically) but is
// deliberately left out of the registry below: silently counting reps from
// an unreliable signal is worse than an honest "no engine yet" badge.
// shoulderFlexionTracker.js used to be excluded for the same reason but now
// reads a real hip-shoulder-elbow joint angle (goniometry-adjacent, not a
// distance heuristic — see its own header) from a SIDE camera, so it's in.
import { createDeadBugTracker } from "./deadBugTracker.js";
import { createGluteBridgeTracker } from "./gluteBridgeTracker.js";
import { createBirdDogTracker } from "./birdDogTracker.js";
import { createSingleLegBridgeTracker } from "./singleLegBridgeTracker.js";
import { createSquatTracker } from "./squatTracker.js";
import { createSitToStandTracker } from "./sitToStandTracker.js";
import { createHeelRaiseTracker } from "./heelRaiseTracker.js";
import { createShoulderAbductionTracker } from "./shoulderAbductionTracker.js";
import { createShoulderFlexionTracker } from "./shoulderFlexionTracker.js";
import { createHipAbductionTracker } from "./hipAbductionTracker.js";
import { createSupermanTracker } from "./supermanTracker.js";
import { createPronePressUpTracker } from "./pronePressUpTracker.js";
import { createSideLyingLegRaiseTracker } from "./sideLyingLegRaiseTracker.js";
import { createSidePlankTracker } from "./sidePlankTracker.js";
import { createFrontPlankTracker } from "./frontPlankTracker.js";
import { createAdductorSqueezeTracker } from "./adductorSqueezeTracker.js";
import { createChinTuckTracker } from "./chinTuckTracker.js";
import { createNeckRotationTracker } from "./neckRotationTracker.js";
import { createNeckSideBendTracker } from "./neckSideBendTracker.js";
import { FEEDBACK_MESSAGES as M } from "./feedbackMessages.js";

export const TRACKED_EXERCISE_COMPONENTS = {
  e4: createDeadBugTracker,             // Dead Bug — lying down, side view
  e3: createGluteBridgeTracker,         // Glute Bridge — lying down, side view
  e5: createBirdDogTracker,             // Bird Dog — hands & knees, side view
  e17: createSingleLegBridgeTracker,    // Single Leg Bridge — lying down, side view
  e9: createSquatTracker,               // Bodyweight Squat — standing, frontal
  e15: createSitToStandTracker,         // Sit-to-Stand — standing, frontal
  e16: createHeelRaiseTracker,          // Heel Raises — standing, frontal
  e14: createShoulderAbductionTracker,  // Shoulder Abduction — standing, frontal
  e13: createShoulderFlexionTracker,    // Shoulder Flexion — standing, side view
  e18: createHipAbductionTracker,       // Standing Hip Abduction — standing, frontal
  e22: createSupermanTracker,           // Superman — prone, side view
  e27: createPronePressUpTracker,       // Prone Press-Up — prone, side view
  e19: createSideLyingLegRaiseTracker,  // Side-Lying Leg Raise — side-lying, side view
  e29: createChinTuckTracker,           // Chin Tuck — seated, side view, head + shoulders in frame
  e30: createNeckRotationTracker,       // Neck Rotation — seated, frontal, head + shoulders in frame
  e31: createNeckSideBendTracker,       // Neck Side Bend — seated, frontal, head + shoulders in frame
};

// Hold-based exercises — a separate registry from the rep-based one above,
// since they need a fundamentally different engine (holdCounter.js: a timer
// gated on staying in position, not a rep-counting phase machine) and a
// different UI (a progress ring toward a target duration, not a rep count).
// Only 3 of the 7 hold-based exercises in the library are built so far
// (Side Plank, Front Plank, Adductor Squeeze) — Hamstring Stretch,
// Piriformis Stretch, Knee-to-Chest, and Child's Pose follow the same
// pattern and are natural next additions, not skipped for a real reason
// the way e.g. Slump Neural Slide was.
export const HOLD_TRACKED_EXERCISES = {
  e6: createSidePlankTracker,      // Side Plank — side-lying, side view
  e23: createFrontPlankTracker,    // Front Plank — prone, side view
  e20: createAdductorSqueezeTracker, // Adductor Squeeze — lying down, side view
};

// What has to be in frame for the "move back / move closer" check (see
// poseQuality.js). Default is 'whole' (near-side shoulder-hip-knee-ankle).
// 'lower' = the pelvis and lower limb only (hip-knee-ankle): bridging, where
// the phone is usually close enough that the head and shoulders are out of
// shot, and the tracker reads the pelvis and thigh, not the torso.
// 'upper' = the head and shoulders only (any camera orientation): seated neck
// exercises, where the hips and legs are out of shot by design.
export const TRACKER_FRAMING_REGION = {
  e3: "lower",   // Glute Bridge
  e17: "lower",  // Single Leg Bridge
  e29: "upper",  // Chin Tuck
  e30: "upper",  // Neck Rotation
  e31: "upper",  // Neck Side Bend
};

// Which camera orientation each tracked exercise expects — drives the
// on-screen setup tip in TrackedExerciseSession.jsx so the instruction shown
// actually matches the exercise, instead of one blanket message.
export const TRACKER_CAMERA_ORIENTATION = {
  e4: "side",
  e3: "side",
  e5: "side",
  e17: "side",
  e9: "frontal",
  e15: "frontal",
  e16: "frontal",
  e14: "frontal",
  e13: "side",
  e18: "frontal",
  e22: "side",
  e27: "side",
  e19: "side",
  e6: "side",
  e23: "side",
  e20: "side",
  e29: "side",
  e30: "frontal",
  e31: "frontal",
};

/** The on-screen / spoken camera set-up instruction for an exercise. */
export function cameraSetupTip(exerciseId) {
  const orientation = TRACKER_CAMERA_ORIENTATION[exerciseId];
  const region = TRACKER_FRAMING_REGION[exerciseId];
  if (region === "upper") return orientation === "side" ? M.cameraSetupTipSeatedSide : M.cameraSetupTipSeatedFrontal;
  if (region === "lower") return M.cameraSetupTipLowerBody;
  return orientation === "side" ? M.cameraSetupTipSide : M.cameraSetupTipFrontal;
}
