/**
 * Shared MediaPipe Pose Landmarker loader for both live-tracking screens
 * (rep-based and hold-based) — previously each screen carried its own copy.
 *
 * Reliability changes vs. the old copies:
 *  - FULL model instead of LITE. Lite is the least accurate model and
 *    mislocates occluded/lying-down limbs far more often; Full is what the
 *    bridge analysis was validated with. (Heavy is more accurate still but
 *    too slow for mid-range phones.)
 *  - WASM path is PINNED to the installed package version. The old code
 *    loaded `@mediapipe/tasks-vision/wasm` (= latest) next to a JS package
 *    locked at an older version; a mismatched JS/WASM pair is a known cause
 *    of silent failures and wrong results. Keep TASKS_VISION_VERSION equal
 *    to the version in package-lock.json when you upgrade the package.
 *  - GPU delegate first (smoother frame rate = less motion blur between
 *    samples), automatic fallback to CPU if the device/browser can't.
 *
 * The model + wasm load from Google's / jsDelivr's CDN at runtime. For fully
 * offline use, download both and point the two URLs below at your own paths.
 */
const TASKS_VISION_VERSION = "0.10.35";
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${TASKS_VISION_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";

let landmarkerPromise = null;

export function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(WASM_URL);
      const make = (delegate) =>
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: "VIDEO",
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        return await make("GPU");
      } catch (err) {
        console.warn("[landmarker] GPU delegate unavailable, falling back to CPU:", err);
        return make("CPU");
      }
    })().catch((err) => {
      landmarkerPromise = null; // allow a retry on the next open instead of caching the failure
      throw err;
    });
  }
  return landmarkerPromise;
}
