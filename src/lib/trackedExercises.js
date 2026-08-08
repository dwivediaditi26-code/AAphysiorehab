// Single source of truth for "which exercises actually have a working camera
// tracker" — shared by the patient exercise flow (to route to the real
// tracking screen) and the therapist exercise library (to show an accurate
// badge instead of the aspirational `ex.tracking` flag, which just means
// "clinically suitable for tracking one day" and does NOT mean a tracker
// exists yet).
import { createDeadBugTracker } from "./deadBugTracker.js";
import { createGluteBridgeTracker } from "./gluteBridgeTracker.js";
import { createBirdDogTracker } from "./birdDogTracker.js";
import { createSingleLegBridgeTracker } from "./singleLegBridgeTracker.js";
import { createSquatTracker } from "./squatTracker.js";
import { createSitToStandTracker } from "./sitToStandTracker.js";
import { createHipHingeTracker } from "./hipHingeTracker.js";
import { createHeelRaiseTracker } from "./heelRaiseTracker.js";
import { createShoulderFlexionTracker } from "./shoulderFlexionTracker.js";

export const TRACKED_EXERCISE_COMPONENTS = {
  e4: createDeadBugTracker,           // Dead Bug
  e3: createGluteBridgeTracker,       // Glute Bridge
  e5: createBirdDogTracker,           // Bird Dog
  e17: createSingleLegBridgeTracker,  // Single Leg Bridge
  e9: createSquatTracker,             // Bodyweight Squat
  e15: createSitToStandTracker,       // Sit-to-Stand
  e8: createHipHingeTracker,          // Hip Hinge
  e16: createHeelRaiseTracker,        // Heel Raises
  e13: createShoulderFlexionTracker,  // Shoulder Flexion
};
