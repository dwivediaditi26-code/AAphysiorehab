/**
 * Shared hold-tracking state machine — the counterpart to repCounter.js, but
 * for isometric holds (Side Plank, Front Plank, Adductor Squeeze) instead of
 * rep-based movements. Every rep tracker in this project watches a signal
 * rise and fall through a range; a hold tracker watches whether the signal
 * STAYS above a threshold for a target duration.
 *
 * Tracks ACCUMULATED time spent genuinely in position, not wall-clock time
 * since first entering — those are different things, and conflating them is
 * a real bug this file used to have: a brief-wobble grace period let the
 * "elapsed" clock keep running even while the patient was fully out of
 * position, as long as they stayed within the grace window, so someone
 * could drop out of a plank entirely and still bank credit toward the
 * target. Fixed by pausing accumulation (not resetting) during a grace
 * window, and only resuming it once the patient is actually back in
 * position — a real break (grace window expires) resets to zero, a brief
 * wobble (they return in time) picks up right where it paused.
 */
export function createHoldTracker(config = {}) {
  const ENTER = config.enter ?? 0.5;
  const BREAK_GRACE_MS = config.breakGraceMs ?? 600;
  const targetMs = config.targetMs ?? 20000;

  const state = {
    inPosition: false,
    accumulatedMs: 0,
    lastFrameAt: null,
    belowSince: null,
    completedHolds: 0,
  };

  return {
    /** Call once per frame with the current normalized "in position" signal
     * (0-1). Returns true on the exact frame accumulated in-position time
     * reaches the target duration. */
    update(signal, now = Date.now()) {
      let completed = false;
      const dt = state.lastFrameAt !== null ? Math.max(0, now - state.lastFrameAt) : 0;
      state.lastFrameAt = now;

      if (signal >= ENTER) {
        state.belowSince = null;
        state.inPosition = true;
        state.accumulatedMs += dt; // only accrues while genuinely in position
      } else if (state.inPosition) {
        if (state.belowSince === null) state.belowSince = now;
        if (now - state.belowSince >= BREAK_GRACE_MS) {
          // genuinely broke position — resets, not paused
          state.inPosition = false;
          state.accumulatedMs = 0;
          state.belowSince = null;
        }
        // else: within the grace window — accumulation pauses here, neither
        // growing nor resetting, until this resolves one way or the other
      }

      if (state.accumulatedMs >= targetMs) {
        state.completedHolds++;
        completed = true;
        state.inPosition = false;
        state.accumulatedMs = 0;
        state.belowSince = null;
      }

      return completed;
    },
    isHolding() { return state.inPosition; },
    getElapsedMs() { return state.accumulatedMs; },
    getTargetMs() { return targetMs; },
    getCompletedHolds() { return state.completedHolds; },
    reset() {
      state.inPosition = false;
      state.accumulatedMs = 0;
      state.lastFrameAt = null;
      state.belowSince = null;
      state.completedHolds = 0;
    },
  };
}
