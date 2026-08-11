// Single source of truth for "which exercises actually have a working camera
// tracker" — shared by the patient exercise flow (to route to the real
// tracking screen) and the therapist exercise library (to show an accurate
// badge instead of the aspirational `ex.tracking` flag, which just means
// "clinically suitable for tracking one day" and does NOT mean a tracker
// exists yet).
// Camera setup is FRONTAL (patient faces the camera) for every exercise here.
// That flips which movements are trackable vs deadBugTracker.js's original
// side-view assumption: sideways motion (abduction) is now reliable, forward
// motion (flexion, hinging) is not — a frontal camera barely sees depth.
// hipHingeTracker.js and shoulderFlexionTracker.js still exist (someone might
// use a side camera for those specifically) but are deliberately left out of
// this registry: under an all-frontal setup they'd silently produce unreliable
// counts, and an honest "no engine yet" badge beats a wrong "Live Tracking" one.
import { createDeadBugTracker } from "./deadBugTracker.js";
import { createGluteBridgeTracker } from "./gluteBridgeTracker.js";
import { createBirdDogTracker } from "./birdDogTracker.js";
import { createSingleLegBridgeTracker } from "./singleLegBridgeTracker.js";
import { createSquatTracker } from "./squatTracker.js";
import { createSitToStandTracker } from "./sitToStandTracker.js";
import { createHeelRaiseTracker } from "./heelRaiseTracker.js";
import { createShoulderAbductionTracker } from "./shoulderAbductionTracker.js";
import { createHipAbductionTracker } from "./hipAbductionTracker.js";

export const TRACKED_EXERCISE_COMPONENTS = {
  e4: createDeadBugTracker,             // Dead Bug — camera placement TBD, see note below
  e3: createGluteBridgeTracker,         // Glute Bridge — camera placement TBD, see note below
  e5: createBirdDogTracker,             // Bird Dog — camera placement TBD, see note below
  e17: createSingleLegBridgeTracker,    // Single Leg Bridge — camera placement TBD, see note below
  e9: createSquatTracker,               // Bodyweight Squat — vertical motion, frontal-safe
  e15: createSitToStandTracker,         // Sit-to-Stand — vertical motion, frontal-safe
  e16: createHeelRaiseTracker,          // Heel Raises — vertical motion, frontal-safe
  e14: createShoulderAbductionTracker,  // Shoulder Abduction — sideways motion, frontal-correct
  e18: createHipAbductionTracker,       // Standing Hip Abduction — sideways motion, frontal-correct
};

// NOT YET RECONCILED WITH FRONTAL CAMERA: the 4 floor exercises above (Dead
// Bug, Glute Bridge, Bird Dog, Single Leg Bridge) were all built assuming a
// side-on view of someone lying down. "Frontal" doesn't have one obvious
// meaning for a person lying flat (overhead? camera at the feet? something
// else?) — left in the registry rather than pulled, but their real-world
// accuracy under whatever "frontal" turns out to mean here is unverified.
