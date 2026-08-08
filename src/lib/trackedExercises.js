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

export const TRACKED_EXERCISE_COMPONENTS = {
  e4: createDeadBugTracker,          // Dead Bug
  e3: createGluteBridgeTracker,      // Glute Bridge
  e5: createBirdDogTracker,          // Bird Dog
  e17: createSingleLegBridgeTracker, // Single Leg Bridge
};
