import React, { useState } from "react";
import {
  PatientExerciseDetail,
  PatientExerciseSession,
  PatientSessionComplete,
  TRACKED_EXERCISE_COMPONENTS,
} from "../patient/ExerciseFlow.jsx";
import TrackedExerciseSession from "../patient/TrackedExerciseSession.jsx";

/**
 * Reuses the exact same patient-facing components (ExerciseFlow.jsx,
 * TrackedExerciseSession.jsx) a real patient sees — this isn't a simplified
 * mock, it's the real flow, opened from the therapist side so you can test
 * an exercise (including live camera tracking) before it ever reaches a
 * patient. Nothing from a preview session is saved anywhere — no session
 * log, no adherence data, no rep history.
 *
 * Renders as a true full-screen takeover with the exact same container
 * structure PatientApp.jsx uses (not a floating modal card) — on a phone
 * this fills the screen edge to edge just like the real patient view; on a
 * wide screen it centers as the same phone-width column patient view uses,
 * for the same reason. A "Preview" badge floats in the corner without
 * taking up layout space, so it stays visually identical to what a patient
 * actually sees while still being unmistakably a preview.
 *
 * Uses an explicit 100dvh (dynamic viewport height) rather than min-h-screen
 * for the outer fixed layer — `position: fixed` + a min-height (not a firm
 * height) is a known combo that breaks mobile browsers' scroll math when
 * their address bar shows/hides, which was cutting the Start Exercise
 * button off below the visible screen with no way to reach it. dvh tracks
 * the real visible viewport instead. Also carries its own overflow-y-auto
 * as a safety net so nothing can ever end up unreachable, even if content
 * (longer instructions, larger fonts, etc.) grows taller than the screen.
 */
export default function ExercisePreview({ ex, prescribed = null, onClose }) {
  const [stage, setStage] = useState("detail"); // detail | session | complete
  const [result, setResult] = useState(null);

  function finish(r) {
    setResult(r);
    setStage("complete");
  }

  const trackerFactory = TRACKED_EXERCISE_COMPONENTS[ex.id];

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-200 flex justify-center overflow-y-auto"
      style={{ height: "100dvh" }}
    >
      <div className="w-full max-w-md bg-gray-50 flex flex-col shadow-xl relative" style={{ minHeight: "100dvh" }}>
        <span className="absolute top-2 right-2 z-10 bg-violet-600 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow">
          Preview
        </span>

        {stage === "detail" && (
          <PatientExerciseDetail ex={ex} prescribed={prescribed} onBack={onClose} onStart={() => setStage("session")} />
        )}

        {stage === "session" && (
          trackerFactory
            ? <TrackedExerciseSession ex={ex} prescribed={prescribed} trackerFactory={trackerFactory} onClose={onClose} onFinish={finish} />
            : <PatientExerciseSession ex={ex} prescribed={prescribed} onClose={onClose} onFinish={finish} />
        )}

        {stage === "complete" && result && (
          <PatientSessionComplete ex={ex} result={result} onContinue={onClose} />
        )}
      </div>
    </div>
  );
}
