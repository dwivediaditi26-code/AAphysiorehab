import React, { useState, useEffect } from "react";
import { ArrowLeft, Video, Play, X, RotateCcw, Check, Smartphone, Timer } from "lucide-react";
import { Pill } from "../ui/Atoms.jsx";
import { getInstructions } from "../../data/seed.js";
import { TRACKED_EXERCISE_COMPONENTS, HOLD_TRACKED_EXERCISES, TRACKER_CAMERA_ORIENTATION } from "../../lib/trackedExercises.js";
import { FEEDBACK_MESSAGES as M } from "../../lib/feedbackMessages.js";
import { unlockSpeechSynthesis } from "../../lib/voiceCoach.js";

export { TRACKED_EXERCISE_COMPONENTS, HOLD_TRACKED_EXERCISES };

export function PatientExerciseDetail({ ex, prescribed, onBack, onStart }) {
  const isTracked = !!TRACKED_EXERCISE_COMPONENTS[ex.id];
  const isHoldTracked = !!HOLD_TRACKED_EXERCISES[ex.id];
  const orientation = TRACKER_CAMERA_ORIENTATION[ex.id];
  const setupTip = orientation === "side" ? M.cameraSetupTipSide : M.cameraSetupTipFrontal;
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white shrink-0">
        <button onClick={onBack} className="text-gray-400"><ArrowLeft size={18} /></button>
        <p className="font-semibold text-gray-900 text-sm flex-1">{ex.name}</p>
        {isTracked && <Pill tone="violet"><span className="inline-flex items-center gap-1"><Video size={11} /> Live Tracking</span></Pill>}
        {isHoldTracked && <Pill tone="violet"><span className="inline-flex items-center gap-1"><Timer size={11} /> Live Hold Tracking</span></Pill>}
      </div>
      <div className="p-5 flex-1 overflow-y-auto">
        {ex.videoUrl ? (
          <video
            src={ex.videoUrl}
            controls
            playsInline
            className="w-full h-40 rounded-2xl bg-black object-cover mb-5"
          />
        ) : (
          <div className="w-full h-40 rounded-2xl bg-violet-50 flex items-center justify-center mb-5">
            <div className="w-14 h-14 rounded-full bg-white shadow flex items-center justify-center text-violet-600">
              <Play size={22} />
            </div>
          </div>
        )}
        {(isTracked || isHoldTracked) && (
          <div className="flex items-start gap-2 bg-violet-50 rounded-xl p-3 mb-5">
            <Smartphone size={15} className="text-violet-500 mt-0.5 shrink-0" />
            <div>
              <span className="text-xs text-gray-700 block">{setupTip.en}</span>
              <span className="text-xs text-gray-500 block" lang="hi">{setupTip.hi}</span>
            </div>
          </div>
        )}
        <div className={`grid ${ex.frequency ? "grid-cols-2" : "grid-cols-3"} gap-2 mb-5`}>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm font-semibold text-gray-900">{prescribed ? prescribed.sets : ex.sets}</p>
            <p className="text-[11px] text-gray-400">Sets</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm font-semibold text-gray-900">{prescribed ? prescribed.reps : ex.reps}</p>
            <p className="text-[11px] text-gray-400">Reps / Hold</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm font-semibold text-gray-900">{ex.rest}</p>
            <p className="text-[11px] text-gray-400">Rest</p>
          </div>
          {ex.frequency && (
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-sm font-semibold text-gray-900">{ex.frequency}</p>
              <p className="text-[11px] text-gray-400">Frequency</p>
            </div>
          )}
        </div>
        <p className="text-xs font-semibold text-gray-500 mb-2">Instructions</p>
        <ul className="space-y-2.5 mb-2">
          {getInstructions(ex.id).map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1.5 shrink-0" />
              <span>
                <span className="text-sm text-gray-600 block">{line.en}</span>
                <span className="text-sm text-gray-400 block" lang="hi">{line.hi}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="p-5 pt-0 shrink-0">
        <button
          onClick={() => { unlockSpeechSynthesis(); onStart(); }}
          className="w-full bg-violet-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-violet-700"
        >
          Start Exercise
        </button>
      </div>
    </div>
  );
}

export function PatientExerciseSession({ ex, prescribed, onClose, onFinish }) {
  const totalSets = prescribed ? prescribed.sets : ex.sets;
  const [currentSet, setCurrentSet] = useState(1);
  const [phase, setPhase] = useState("active");
  const [restLeft, setRestLeft] = useState(0);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [startTime]);

  useEffect(() => {
    if (phase !== "resting") return;
    if (restLeft <= 0) { setPhase("active"); setCurrentSet((s) => s + 1); return; }
    const t = setTimeout(() => setRestLeft((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, restLeft]);

  function completeSet() {
    if (currentSet >= totalSets) { onFinish({ sets: totalSets, duration: elapsed }); return; }
    setRestLeft(parseInt(ex.rest) || 20);
    setPhase("resting");
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0">
        <p className="font-semibold text-gray-900 text-sm">{ex.name}</p>
        <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {phase === "active" ? (
          <>
            <p className="text-xs text-gray-400 mb-2">Set {currentSet} of {totalSets}</p>
            <div className="w-40 h-40 rounded-full bg-white shadow-sm border border-gray-100 flex flex-col items-center justify-center mb-6">
              <span className="text-3xl font-bold text-gray-900">{prescribed ? prescribed.reps : ex.reps}</span>
              <span className="text-xs text-gray-400">reps</span>
            </div>
            <p className="text-xs text-gray-400 mb-6">Elapsed {formatTime(elapsed)}</p>
            <button onClick={completeSet} className="w-full max-w-xs bg-violet-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-violet-700">
              Complete Set
            </button>
          </>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-2">Rest before Set {currentSet + 1}</p>
            <div className="w-40 h-40 rounded-full bg-white shadow-sm border border-violet-100 flex items-center justify-center mb-6">
              <span className="text-3xl font-bold text-violet-600">{restLeft}s</span>
            </div>
            <button onClick={() => { setPhase("active"); setCurrentSet((s) => s + 1); }} className="text-sm text-gray-400 underline flex items-center gap-1">
              <RotateCcw size={13} /> Skip rest
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function PatientSessionComplete({ ex, result, onContinue }) {
  function formatTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
        <Check size={28} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">Great Work!</h2>
      <p className="text-sm text-gray-500 mb-6">You completed {ex.name}</p>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 w-full max-w-xs grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-lg font-semibold text-gray-900">{result.sets} / {result.sets}</p>
          <p className="text-xs text-gray-400">Sets</p>
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{formatTime(result.duration)}</p>
          <p className="text-xs text-gray-400">Duration</p>
        </div>
      </div>
      {result.formFeedback ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 w-full max-w-xs mb-6 text-left">
          <p className="text-xs font-semibold text-gray-500 mb-2">Form feedback</p>
          <ul className="space-y-2">
            {result.formFeedback.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 mt-1 shrink-0" />
                <span>
                  <span className="text-xs text-gray-600 block">{line.en}</span>
                  <span className="text-xs text-gray-400 block" lang="hi">{line.hi}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-gray-300 mb-6">Marked as complete for today</p>
      )}
      <button onClick={onContinue} className="w-full max-w-xs bg-violet-600 text-white text-sm font-semibold py-3 rounded-xl hover:bg-violet-700">
        Continue
      </button>
    </div>
  );
}
