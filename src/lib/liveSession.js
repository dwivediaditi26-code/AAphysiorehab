/**
 * The per-frame brain of a live rep-tracking session, with no camera, canvas,
 * speech or React in it — so the exact pipeline the screen runs can be tested
 * in node on real landmarks.
 *
 *   raw landmarks -> smoothing + framing verdict (poseQuality.js)
 *                 -> "Let's get started in 3, 2, 1" once the setup is good
 *                 -> tracker -> reps / feedback -> events for the screen to speak
 *
 * Phases the screen can render from the result:
 *   positioning  !armed                  "Get in position…" + any framing prompt
 *   countdown    armed && !started       countdown = 3 | 2 | 1
 *   live         started                 reps, feedback, timer
 *
 * The tracker is fed from the moment the setup is good — including during the
 * countdown — so the patient's own resting baseline is measured while they lie
 * still. Nothing is COUNTED, timed or announced until "Go".
 *
 * Events (the screen turns them into speech):
 *   { type: 'countdown', announce: 'start' | 'tick', number }
 *   { type: 'go' }
 *   { type: 'rep', count, correction }   correction = feedback object or null
 *   { type: 'framing', status }          a debounced, rate-limited framing prompt
 */
import { createPoseQuality } from "./poseQuality.js";
import { createStartCountdown } from "./startCountdown.js";

export function createLiveSession({ trackerFactory, orientation = "frontal", region = "whole", targetReps } = {}) {
  const tracker = trackerFactory();
  const quality = createPoseQuality({ orientation, region });
  const countdown = createStartCountdown();
  const target = Number.isFinite(targetReps) && targetReps > 0 ? targetReps : Infinity;

  let started = false;
  let startedAt = null;
  let prevReps = 0;
  let reps = 0, feedback = [], hint = null, elapsed = 0;

  return {
    /** The underlying tracker (the screen reads getFeedback() from it when finishing). */
    tracker,

    /** meta.aspect = videoWidth / videoHeight. */
    process(rawLandmarks, now = Date.now(), meta = {}) {
      const q = quality.process(rawLandmarks, now, meta);
      const events = [];

      const cd = countdown.update(q.framing.status === "ok", now);
      if (cd.announce) events.push({ type: "countdown", announce: cd.announce, number: cd.number });

      if (q.trackable && q.armed) tracker.processFrame(q.landmarks, now, meta);

      if (cd.justFinished) {
        // Whatever the tracker saw before Go doesn't count: start clean. (Only
        // matters if someone did a rep during the countdown.)
        if (tracker.getRepCount() > 0) tracker.reset();
        started = true; startedAt = now; prevReps = 0;
        reps = 0; feedback = []; hint = null;
        events.push({ type: "go" });
      }

      let repJustCompleted = false;
      if (started) {
        elapsed = Math.floor((now - startedAt) / 1000);
        if (q.trackable && q.armed) {
          reps = tracker.getRepCount();
          feedback = tracker.getFeedback();
          hint = tracker.getStatusHint ? tracker.getStatusHint() : null;
          repJustCompleted = reps > prevReps;
          prevReps = reps;
          if (repJustCompleted) {
            const primary = q.framing.status === "ok" ? feedback[0] : null;
            events.push({ type: "rep", count: reps, correction: primary && !primary.good ? primary : null });
          }
        }
      }

      // Framing prompts are debounced + capped in poseQuality.js; don't talk over a rep count.
      if (q.framing.speak && !repJustCompleted) events.push({ type: "framing", status: q.framing.status });

      return {
        landmarks: q.landmarks,
        framing: q.framing,
        armed: q.armed,
        trackable: q.trackable,
        started,
        countdown: cd.phase === "counting" ? cd.number : null,
        reps, feedback, hint, elapsed,
        events,
        finished: started && reps >= target,
      };
    },

    reset() {
      quality.reset(); countdown.reset(); tracker.reset();
      started = false; startedAt = null; prevReps = 0;
      reps = 0; feedback = []; hint = null; elapsed = 0;
    },
  };
}
