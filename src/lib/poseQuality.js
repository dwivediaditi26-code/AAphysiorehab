/**
 * Pose quality layer: decides whether the camera setup is GOOD ENOUGH to
 * trust the tracker, and says so without nagging.
 *
 * Why this exists: the old check (isWholeBodyInFrame) required visibility
 * >= 0.5 on nose, BOTH wrists, and BOTH sides' hips/knees/ankles. In any
 * side-on view (every lying-down exercise) the far-side limbs sit behind the
 * near-side ones, MediaPipe scores them < 0.5 even in a perfect shot, and the
 * app said "Move back" on 100% of frames of a correctly framed real clip.
 *
 * What we do instead:
 *   - Judge framing with GEOMETRY, not the visibility score: is the body part
 *     that matters actually inside the image? (MediaPipe places cut-off body
 *     parts outside 0..1.) Side view checks only the NEAR-side chain
 *     shoulder-hip-knee-ankle; the hidden far side is ignored.
 *   - Say WHICH problem it is: cut off (move back), too small (move closer),
 *     or low confidence (light / clothing / clutter) — different fixes.
 *   - Hysteresis: a problem must persist ~1.5 s before it is reported, and
 *     must be gone ~0.5 s before it clears, so one bad frame never flashes a
 *     warning; voice repeats are capped (max 3, >= 15 s apart).
 *   - "Armed" latch: rep counting only starts once the setup has been
 *     good for a moment, so walking onto the mat can't count phantom reps.
 *
 * Framing REGIONS (side view only): what has to be inside the frame.
 *   'whole' — near-side shoulder, hip, knee, ankle. For lying exercises that
 *             read the torso (dead bug, bird dog, planks...).
 *   'lower' — near-side hip, knee, ankle: the pelvis and a lower limb. For
 *             bridging, where the phone is often close enough that the head
 *             and shoulders fall out of shot. Nothing above the pelvis is
 *             required, so it can't ask for something the camera never needs.
 *             It is also more forgiving at the edges (a phone on the floor
 *             puts a lying body right at the bottom of the image) and judges
 *             size on the pelvis-to-ankle chain, aspect-corrected.
 */
import { createLandmarkSmoother } from "./landmarkSmoother.js";
import { hasMinimalPose, hasLowerBody } from "./trackingMath.js";

const SIDE = {
  left: { shoulder: 11, hip: 23, knee: 25, ankle: 27 },
  right: { shoulder: 12, hip: 24, knee: 26, ankle: 28 },
};

const WHOLE_JOINTS = ["shoulder", "hip", "knee", "ankle"];
const LOWER_JOINTS = ["hip", "knee", "ankle"];
// A joint counts as cut off only when it is more than this far OUTSIDE the
// image (MediaPipe extrapolates missing joints beyond 0..1). Negative = allowed
// overshoot, so a joint sitting on the very edge is not a "move back".
const LOWER_MARGIN = -0.03;
const LOWER_MIN_EXTENT = 0.12; // pelvis-to-ankle span / larger image side; the real clip is ~0.21

const vis = (p) => (p ? p.visibility ?? 1 : 0);

/**
 * Which side the camera sees best (sum of visibility over the chain).
 * Pass `prev` to make the choice sticky: it only flips when the other side is
 * clearly better, so two near-equal sides can't alternate frame to frame.
 */
export function nearSide(landmarks, { prev = null, joints = WHOLE_JOINTS, switchGap = 0.3 } = {}) {
  const score = (side) => joints.reduce((s, name) => s + vis(landmarks[SIDE[side][name]]), 0);
  const l = score("left"), r = score("right");
  if (prev === "left") return r > l + switchGap ? "right" : "left";
  if (prev === "right") return l > r + switchGap ? "left" : "right";
  return r > l + 0.05 ? "right" : "left";
}

const outOfFrame = (p, margin) => p.x < margin || p.x > 1 - margin || p.y < margin || p.y > 1 - margin;

/**
 * Instantaneous (single-frame) framing verdict. Use createFramingMonitor to
 * turn a stream of these into a stable, non-flickering status.
 *
 * status: 'ok' | 'no_person' | 'cut_off' | 'too_small' | 'low_confidence'
 * region: 'whole' | 'lower' (side view only — see the header). aspect =
 * videoWidth / videoHeight, used to judge size in the 'lower' region.
 * prevSide: the side chosen last frame (keeps the near side from flip-flopping).
 */
export function assessFraming(landmarks, { orientation = "frontal", region = "whole", margin, aspect, prevSide = null } = {}) {
  const lower = orientation === "side" && region === "lower";
  if (!landmarks || landmarks.length < 29 || !(lower ? hasLowerBody(landmarks) : hasMinimalPose(landmarks))) {
    return { status: "no_person", cutOff: [], side: null };
  }
  const edge = margin ?? (lower ? LOWER_MARGIN : 0.02);

  let required; // [name, index]
  let side = null;
  if (orientation === "side") {
    const joints = lower ? LOWER_JOINTS : WHOLE_JOINTS;
    side = nearSide(landmarks, { prev: prevSide, joints });
    required = joints.map((name) => [name, SIDE[side][name]]);
  } else {
    // Frontal: both sides are visible, but webcams at desk height rarely
    // see feet, so require shoulders/hips/knees only.
    required = [["shoulder", 11], ["shoulder", 12], ["hip", 23], ["hip", 24], ["knee", 25], ["knee", 26]];
  }

  const pts = required.map(([name, i]) => ({ name, p: landmarks[i] }));
  const cutOff = [...new Set(pts.filter(({ p }) => !p || outOfFrame(p, edge)).map(({ name }) => name))];
  if (cutOff.length) return { status: "cut_off", cutOff, side };

  // Confidence of the body we actually need (mean of required visibilities).
  const meanVis = pts.reduce((s, { p }) => s + vis(p), 0) / pts.length;
  if (meanVis < 0.35) return { status: "low_confidence", cutOff: [], side };

  // Size: model accuracy drops when the person is a small blob in the frame.
  const xs = pts.map(({ p }) => p.x), ys = pts.map(({ p }) => p.y);
  const xSpan = Math.max(...xs) - Math.min(...xs), ySpan = Math.max(...ys) - Math.min(...ys);
  if (lower) {
    // Same units on both axes (x * aspect), relative to the larger image side —
    // the model's working resolution follows the larger side, so a phone held
    // portrait or landscape is judged the same way.
    const a = aspect && isFinite(aspect) ? aspect : 1;
    if (Math.max(xSpan * a, ySpan) / Math.max(1, a) < LOWER_MIN_EXTENT) return { status: "too_small", cutOff: [], side };
  } else if (Math.max(xSpan, ySpan) < (orientation === "side" ? 0.28 : 0.3)) {
    return { status: "too_small", cutOff: [], side };
  }

  return { status: "ok", cutOff: [], side };
}

/**
 * Debounces assessFraming() verdicts into a stable status.
 * update() returns { status, changed, speak }.
 *   status  — stable status ('initializing' until the first stable verdict)
 *   changed — true on the frame the stable status flips
 *   speak   — true when a voice prompt is warranted (rate-limited)
 */
export function createFramingMonitor(config = {}) {
  const BAD_AFTER_MS = config.badAfterMs ?? 1500;
  const GOOD_AFTER_MS = config.goodAfterMs ?? 600;
  const SPEAK_GAP_MS = config.speakGapMs ?? 15000;
  const MAX_SPEAKS = config.maxSpeaks ?? 3;

  let stable = "initializing";
  let pending = null, pendingSince = 0;
  let lastSpokeAt = -Infinity;
  const spoken = {};

  return {
    update(verdict, now = Date.now()) {
      const candidate = verdict.status;
      let changed = false;

      if (candidate === stable) {
        pending = null;
      } else if (pending !== candidate) {
        pending = candidate; pendingSince = now;
      } else if (now - pendingSince >= (candidate === "ok" ? GOOD_AFTER_MS : BAD_AFTER_MS)) {
        stable = candidate; pending = null; changed = true;
      }

      let speak = false;
      if (stable !== "ok" && stable !== "initializing") {
        const count = spoken[stable] || 0;
        if (count < MAX_SPEAKS && (changed || now - lastSpokeAt >= SPEAK_GAP_MS)) {
          speak = true; spoken[stable] = count + 1; lastSpokeAt = now;
        }
      }
      return { status: stable, changed, speak, cutOff: verdict.cutOff };
    },
    getStatus() { return stable; },
    reset() { stable = "initializing"; pending = null; lastSpokeAt = -Infinity; for (const k in spoken) delete spoken[k]; },
  };
}

/**
 * One-stop pipeline used by the session screens:
 *   raw MediaPipe landmarks -> smoothed landmarks + stable framing status +
 *   `armed` latch (true once the setup has been good; stays true).
 * `trackable` = a torso is visible enough to run the tracker on this frame.
 */
export function createPoseQuality({ orientation = "frontal", region = "whole", smoother, monitor } = {}) {
  const sm = smoother || createLandmarkSmoother();
  const mon = monitor || createFramingMonitor();
  const lower = orientation === "side" && region === "lower";
  let armed = false;
  let side = null; // last near side — keeps the choice from flip-flopping frame to frame

  return {
    /** meta.aspect = videoWidth / videoHeight (used to judge size in the 'lower' region). */
    process(rawLandmarks, now = Date.now(), meta = {}) {
      const landmarks = sm.smooth(rawLandmarks, now);
      const verdict = assessFraming(landmarks, { orientation, region, aspect: meta.aspect, prevSide: side });
      if (verdict.side) side = verdict.side;
      const framing = mon.update(verdict, now);
      if (framing.status === "ok") armed = true;
      return {
        landmarks,
        trackable: lower ? hasLowerBody(landmarks) : hasMinimalPose(landmarks),
        framing,       // { status, changed, speak, cutOff }
        armed,
        verdict,       // raw single-frame verdict (debug)
      };
    },
    isArmed() { return armed; },
    reset() { sm.reset(); mon.reset(); armed = false; side = null; },
  };
}
