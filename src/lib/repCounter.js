/**
 * Shared rep-counting state machine. Every tracker used to inline this exact
 * pattern (idle -> active -> idle, count on crossing back below EXIT) —
 * duplicated 12 times, and every copy counted on a single noisy frame
 * crossing the threshold, with no debounce. Real camera landmark jitter can
 * make the signal dip below EXIT for a moment mid-hold (e.g. at the top of
 * a bridge) and bounce back, which the old logic read as "rep finished, new
 * rep started" — double-counting one physical rep as two. A rep should only
 * be counted when the exercise is genuinely done and settled back near the
 * start — not on a brief blip through the return threshold.
 *
 * Fix: the signal must stay below EXIT for EXIT_DEBOUNCE_MS of real time
 * (not just one frame, and not a raw frame count either — camera/device
 * frame rate varies, so time is the correct unit) before the rep is
 * finalized and phase resets — a real return stays down, a noise blip
 * doesn't. MIN_REP_INTERVAL_MS is a second guard: two "reps" faster than a
 * human could actually move are rejected outright.
 *
 * Two-sided trackers (Dead Bug, Bird Dog, Hip Abduction, Side-Lying Leg
 * Raise) just use two instances of this — one per side.
 */
export function createRepCounter(config = {}) {
  const ENTER = config.enter ?? 0.35;
  const EXIT = config.exit ?? 0.18;
  const MIN_PEAK = config.minPeak ?? 0.3;
  const EXIT_DEBOUNCE_MS = config.exitDebounceMs ?? 200;
  const MIN_REP_INTERVAL_MS = config.minRepIntervalMs ?? 350;

  const state = {
    phase: "idle", // idle | active
    peak: 0,
    reps: 0,
    belowExitSince: null,
    lastRepAt: 0,
  };

  return {
    /** Call once per frame with the current normalized signal (0-1) for this
     * side. Returns true on the exact frame a rep is finalized — use that to
     * grab whatever form-check flags accumulated during the active phase
     * before they'd otherwise carry into the next rep. */
    update(signal, now = Date.now()) {
      let completed = false;

      if (state.phase === "idle") {
        if (signal > ENTER) {
          state.phase = "active";
          state.peak = signal;
          state.belowExitSince = null;
        }
        return completed;
      }

      // active
      if (signal > state.peak) state.peak = signal;

      if (signal < EXIT) {
        if (state.belowExitSince === null) state.belowExitSince = now;
        if (now - state.belowExitSince >= EXIT_DEBOUNCE_MS) {
          if (state.peak >= MIN_PEAK && now - state.lastRepAt >= MIN_REP_INTERVAL_MS) {
            state.reps++;
            state.lastRepAt = now;
            completed = true;
          }
          state.phase = "idle";
          state.peak = 0;
          state.belowExitSince = null;
        }
      } else {
        state.belowExitSince = null; // bounced back up — not a real return, reset the debounce timer
      }

      return completed;
    },
    isActive() { return state.phase === "active"; },
    getPeak() { return state.peak; },
    getRepCount() { return state.reps; },
    reset() {
      state.phase = "idle";
      state.peak = 0;
      state.reps = 0;
      state.belowExitSince = null;
      state.lastRepAt = 0;
    },
  };
}
