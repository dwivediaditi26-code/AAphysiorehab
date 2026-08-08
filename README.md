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
