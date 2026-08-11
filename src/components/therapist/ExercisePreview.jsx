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
    <div className="fixed inset-0 bg-gray-900/60 z-50 flex items-center justify-center p-4">
      <div
        className="w-full max-w-md bg-gray-50 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        style={{ height: "min(720px, 92vh)" }}
      >
        <div className="px-4 py-2 bg-violet-600 text-white text-[11px] font-medium text-center shrink-0">
          Therapist Preview — this is exactly what a patient sees. Nothing is saved.
        </div>

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
