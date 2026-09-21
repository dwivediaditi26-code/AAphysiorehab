/**
 * "Let's get started in 3, 2, 1" — the pause between "the camera can see you"
 * and "reps count", so the patient can settle into the start position.
 *
 * Pure state machine (no timers, no speech, no React): feed it `ready` (is the
 * setup good right now?) and the current time on every frame and it says what
 * to show and what to announce. Kept separate from the screen so it can be
 * tested in node.
 *
 *   - Runs only while `ready`. If the setup is lost mid-countdown it starts
 *     over from 3 the next time the setup is good, so nobody is counted in
 *     before the camera can actually see them.
 *   - The first number gets extra time (LEAD_MS) because "Let's get started
 *     in three" takes about that long to say; then one number per second.
 *   - Once it finishes it stays done (the session never re-counts down).
 *
 * update() returns { phase, number, announce, justFinished }
 *   phase       'waiting' (not ready) | 'counting' | 'done'
 *   number      3 | 2 | 1 while counting, else null
 *   announce    'start' (first frame of "3": say "Let's get started in three"),
 *               'tick' (first frame of 2 / 1: say the number), or null
 *   justFinished true on the single frame the countdown completes ("Go")
 */
export function createStartCountdown(config = {}) {
  const FROM = config.from ?? 3;
  const LEAD_MS = config.leadMs ?? 1400;
  const TICK_MS = config.tickMs ?? 1000;

  let startedAt = null;
  let lastNumber = null;
  let done = false;

  const out = (phase, number = null, announce = null, justFinished = false) => ({ phase, number, announce, justFinished });

  return {
    update(ready, now = Date.now()) {
      if (done) return out("done");
      if (!ready) { startedAt = null; lastNumber = null; return out("waiting"); }

      if (startedAt === null) startedAt = now;
      const t = now - startedAt;
      const step = t < LEAD_MS ? 0 : 1 + Math.floor((t - LEAD_MS) / TICK_MS);
      const number = FROM - step;

      if (number < 1) { done = true; return out("done", null, null, true); }

      const announce = number !== lastNumber ? (step === 0 ? "start" : "tick") : null;
      lastNumber = number;
      return out("counting", number, announce);
    },
    isDone() { return done; },
    reset() { startedAt = null; lastNumber = null; done = false; },
  };
}
