# PhysioRehab

Private rehab platform: therapist dashboard (patients, exercise library, rehab
plan builder, calendar, messages, progress) + patient mobile app (today's
plan, exercise sessions, live camera tracking for Dead Bug).

Runs on mock data — no backend yet. Build-verified: `npm install && npm run
build` completes clean (2318 modules, no errors) as of this scaffold.

## Setup

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build -> dist/
```

Login screen lets you pick a role (Therapist/Patient) and, for demo purposes,
which seeded person to sign in as — any password works, nothing is checked
yet.

## Structure

```
src/
  data/seed.js              mock patients, exercises, templates, messages...
  lib/
    helpers.js               generatePlan, generateSessions, etc.
    deadBugTracker.js         pose-tracking rep-counting engine (pure JS, no deps)
  components/
    ui/                       shared atoms (StatCard, Modal, Pill, ...)
    Sidebar.jsx
    therapist/                Dashboard, Patients, PlanBuilder, Calendar,
                               Messages, ExerciseLibrary, Progress, Settings
    patient/
      PatientApp.jsx          home/plan/progress/profile tabs, tab shell
      ExerciseFlow.jsx        exercise detail -> session -> complete
      DeadBugCameraSession.jsx  real camera + MediaPipe tracking screen
    auth/Auth.jsx             login + first-login password setup
  App.jsx                     top-level state + routing
```

One exercise (Dead Bug) has live camera tracking end to end. To add another,
copy `deadBugTracker.js`'s shape (landmarks in, phase state machine, rep
count + feedback out) for the new exercise, build a session component the
same way `DeadBugCameraSession.jsx` does, and add it to
`TRACKED_EXERCISE_COMPONENTS` in `ExerciseFlow.jsx`.

## What's real vs. mock

**Real:** the whole UI, the Dead Bug tracking engine, and the camera +
MediaPipe wiring (`DeadBugCameraSession.jsx`) — this actually opens the
camera and counts reps once deployed to a real HTTPS URL.

**Mock, no backend yet:**
- Auth — any password works, nothing is verified against a server
- All data — patients, plans, messages, appointments — lives in React state,
  resets on refresh
- Therapist/patient identity is picked from a dropdown at login, not real
  accounts

## Next: wiring Supabase

Natural next step once this is deployed and the UI is confirmed working on
a real device:
- Auth — Supabase Auth, replacing the role-picker in `Auth.jsx`
- Data — the tables sketched in the original product brief (`users`,
  `patients`, `exercises`, `rehab_plans`, `plan_weeks`, `plan_days`,
  `prescribed_exercises`, `exercise_sessions`) replacing `data/seed.js` and
  the `useState` calls in `App.jsx` with real queries
- Row Level Security so a patient can only read their own records

## Deploying

Matches the Vercel auto-deploy pattern used for the other PhysioMind
projects: push this to a GitHub repo, connect it on Vercel, done — Vite
projects need no extra config.

```bash
git init
git add .
git commit -m "Initial scaffold from chat-artifact build"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

Camera tracking (`getUserMedia`) requires HTTPS or `localhost` — Vercel's
default `*.vercel.app` domain covers this automatically.


## Live tracking reliability

Camera tracking runs every landmark through `src/lib/poseQuality.js` and
`landmarkSmoother.js` before any tracker sees it:

- **Smoothing + glitch guard**: One Euro filter. A joint MediaPipe can't see
  (low visibility) is frozen, not trusted. Single-frame teleports are held.
- **Framing check**: judges whether the *near-side* body chain is inside the
  frame, not the raw visibility score (which is always low for the hidden far
  side in a side view). Reports cut off / too small / low confidence
  separately, debounced (~1.5 s) and voice-capped (3 prompts).
- **Armed latch**: reps only count once the setup has been good for a moment.
- **Bridging** (`gluteBridgeTracker.js`, `singleLegBridgeTracker.js`) uses
  `hipExtensionSignal.js`: near-side chain, aspect-corrected angle, median
  filter, per-patient resting baseline. Cues: slower, lift higher, hips
  sagged. Deliberately no cue for what a camera can't measure: core/glute
  engagement, over-arching, left/right hip level from a side view.
- **Bridging needs only the pelvis and lower limb in frame.** Its framing check
  (`TRACKER_FRAMING_REGION` in `trackedExercises.js`) asks for the near-side hip,
  knee and ankle — not the head or shoulders — and tolerates a body sitting on
  the bottom edge (phone on the floor). When the shoulder isn't reliably in
  shot, the signal switches to `pelvicLiftSignal.js` (pelvis rise measured in
  thigh lengths); with the shoulder in shot the shoulder-hip-knee angle is
  used as before. The pelvis-only target (a 0.35-thigh-length rise = full
  bridge) is one person on one clip — validate it like the other thresholds.
- **Start countdown** (`startCountdown.js`, `liveSession.js`): once the camera
  has seen a good setup, the screen says "Let's get started in 3, 2, 1" and
  nothing counts until Go. The resting baseline is measured while the patient
  lies still during the countdown. If the setup is lost mid-countdown it starts
  over from 3.
- **Near side is locked once calibrated** (`hipExtensionSignal.js`,
  `pelvicLiftSignal.js`). Which leg faces the camera used to be re-picked from
  raw visibility on every single frame, so a brief but strongly asymmetric
  movement — deliberately lifting the other leg, in one real report — could
  flip which leg's landmarks fed the signal. The rest baseline had been
  calibrated for the OLD leg's geometry, so after a flip the extension value
  could get stuck near 0 or 1 and the tracker stopped counting reps for the
  rest of the session. Now the side is chosen freely only until the baseline
  calibrates, then frozen for the session (`reset()` unfreezes it).
- **Glute Bridge flags a lifted leg** (`gluteBridgeTracker.js`): the near-side
  knee angle is compared to where it was when the current rep started; a
  straightening well past that (a leg lifting/extending, not a two-leg bridge)
  still counts the rep — the hips did rise — but says "keep your knee bent"
  instead of "Good". Draft threshold from one clip with no real
  "lifted-a-leg" footage; won't catch a bent-knee march (knee angle roughly
  unchanged, whole leg lifts).
- **repCounter self-heal watchdog** (`repCounter.js`): if "active" ever
  persists implausibly long (default 45 s — generous enough that no
  legitimate slow, controlled rep should ever hit it) without the signal
  returning, the counter abandons that attempt (no rep credited) and goes
  back to idle, so a genuinely stuck signal — from this or any other cause —
  can't leave the app silently not counting for the rest of the session.
- **Hands-free "point and hold" control** (`airPointer.js`, `screenMapping.js`,
  `AirPointerOverlay.jsx`) — for when the phone is propped up out of reach,
  which is most floor exercises. Raise a hand above your head and it becomes
  a cursor on screen; hold it over Pause/Resume, Finish, or the X for ~1s to
  activate it, same as tapping. "Above the head" is a deliberately high bar —
  clear of every tracked exercise's OWN completion threshold (Shoulder
  Abduction/Flexion target ~90°, shoulder height, not overhead) — but a
  patient who raises noticeably past what's prescribed could approach it;
  draft, validate before adding an exercise with real overhead reach.
  Shared by both live tracking screens; a header toggle turns it off. Only
  reaches the two screens where the camera is already running — the
  pre-session "Start Exercise" button doesn't have a camera active yet, so
  it isn't reachable this way without a bigger change (starting the camera
  earlier).
- **Shoulder Abduction and Flexion read a real joint angle**
  (`shoulderAbductionTracker.js`, `shoulderFlexionTracker.js`): hip-shoulder-
  elbow, the same construction goniometry and the pose-estimation literature
  both use for this joint (published 2D-pose studies using this exact
  definition report ~9-13° mean error against 3D motion capture) — not the
  previous horizontal-distance-from-shoulder heuristic. Abduction reads both
  arms (frontal camera, frontal-plane movement); Flexion reads the near side
  only (side camera, sagittal-plane movement) and is now registered
  (`e13`) — it used to be built but deliberately left unregistered because
  its old signal wasn't trustworthy enough, and it also still had the
  pre-`repCounter.js` double-counting bug (a noisy frame crossing the exit
  threshold with no debounce); both are fixed. Fixed-degree thresholds, not
  per-patient calibrated like the bridge signal — a draft, not tuned per
  body type or validated on real footage.
- Model: Pose Landmarker **Full**, WASM pinned to the installed package version
  (`src/lib/landmarker.js`: keep `TASKS_VISION_VERSION` equal to
  `package-lock.json`), GPU delegate with CPU fallback.

`npm test` runs the synthetic tracker suite plus `test-bridge-reliability.mjs`,
which replays **real** MediaPipe landmarks (`test-fixtures/`). Thresholds are a
draft from one studio clip. Add your own patients' footage (correct AND
wrong-form reps) to `test-fixtures/` before trusting a cue clinically.
