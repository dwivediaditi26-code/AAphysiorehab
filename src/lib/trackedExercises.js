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
// and shoulderFlexionTracker.js still exist (someone might use a side
// camera for those specifically) but are deliberately left out of the
// registry below: silently counting reps from an unreliable signal is worse
// than an honest "no engine yet" badge.
import { createDeadBugTracker } from "./deadBugTracker.js";
import { createGluteBridgeTracker } from "./gluteBridgeTracker.js";
import { createBirdDogTracker } from "./birdDogTracker.js";
import { createSingleLegBridgeTracker } from "./singleLegBridgeTracker.js";
import { createSquatTracker } from "./squatTracker.js";
import { createSitToStandTracker } from "./sitToStandTracker.js";
import { createHeelRaiseTracker } from "./heelRaiseTracker.js";
import { createShoulderAbductionTracker } from "./shoulderAbductionTracker.js";
import { createHipAbductionTracker } from "./hipAbductionTracker.js";
import { createSupermanTracker } from "./supermanTracker.js";
import { createPronePressUpTracker } from "./pronePressUpTracker.js";
import { createSideLyingLegRaiseTracker } from "./sideLyingLegRaiseTracker.js";
import { createSidePlankTracker } from "./sidePlankTracker.js";
import { createFrontPlankTracker } from "./frontPlankTracker.js";
import { createAdductorSqueezeTracker } from "./adductorSqueezeTracker.js";

export const TRACKED_EXERCISE_COMPONENTS = {
  e4: createDeadBugTracker,             // Dead Bug — lying down, side view
  e3: createGluteBridgeTracker,         // Glute Bridge — lying down, side view
  e5: createBirdDogTracker,             // Bird Dog — hands & knees, side view
  e17: createSingleLegBridgeTracker,    // Single Leg Bridge — lying down, side view
  e9: createSquatTracker,               // Bodyweight Squat — standing, frontal
  e15: createSitToStandTracker,         // Sit-to-Stand — standing, frontal
  e16: createHeelRaiseTracker,          // Heel Raises — standing, frontal
  e14: createShoulderAbductionTracker,  // Shoulder Abduction — standing, frontal
  e18: createHipAbductionTracker,       // Standing Hip Abduction — standing, frontal
  e22: createSupermanTracker,           // Superman — prone, side view
  e27: createPronePressUpTracker,       // Prone Press-Up — prone, side view
  e19: createSideLyingLegRaiseTracker,  // Side-Lying Leg Raise — side-lying, side view
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
  e18: "frontal",
  e22: "side",
  e27: "side",
  e19: "side",
  e6: "side",
  e23: "side",
  e20: "side",
};
