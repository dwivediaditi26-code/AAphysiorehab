import React, { useEffect, useRef, useState } from "react";
import { X, Pause, Play, AlertTriangle, VolumeX } from "lucide-react";
import { parseRepsTarget } from "../../lib/helpers.js";
import { createLiveSession } from "../../lib/liveSession.js";
import { getLandmarker } from "../../lib/landmarker.js";
import { FEEDBACK_MESSAGES as M } from "../../lib/feedbackMessages.js";
import { TRACKER_CAMERA_ORIENTATION, TRACKER_FRAMING_REGION } from "../../lib/trackedExercises.js";
import { createVoiceCoach } from "../../lib/voiceCoach.js";
import { numberWord } from "../../lib/numberWords.js";

/**
 * Real camera + MediaPipe Pose Landmarker exercise-tracking screen. Generic —
 * takes a `trackerFactory` (e.g. createDeadBugTracker, createGluteBridgeTracker)
 * so the same camera/overlay/UI plumbing is shared across every tracked exercise.
 * See TRACKED_EXERCISE_COMPONENTS in ExerciseFlow.jsx for the exercise -> tracker map.
 *
 * Props:
 *   ex             — exercise record (needs ex.id, ex.name, ex.sets, ex.reps)
 *   prescribed     — { sets, reps } as prescribed to this patient for today, or null
 *   trackerFactory — function returning a tracker (processFrame/getRepCount/getFeedback/reset)
 *   onClose        — called when the patient backs out without finishing
 *   onFinish       — called with { sets, duration, reps, formFeedback } when done
 *
 * Requires: npm install @mediapipe/tasks-vision
 * Requires HTTPS (or localhost) — getUserMedia is blocked on plain HTTP.
 *
 * Model + wasm assets load from Google's CDN at runtime (no bundling needed):
 *   https://storage.googleapis.com/mediapipe-models/...
 *   https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm
 * For fully offline/self-hosted use, download both and point modelAssetPath /
 * FilesetResolver.forVisionTasks(...) at your own paths instead.
 */

// Which message to show/speak for each stable framing problem (see poseQuality.js).
// The 'lower' region (bridging) names what it actually needs: hips, knees and feet.
const framingMessages = (region) => ({
  no_person: M.noPersonDetected,
  cut_off: region === "lower" ? M.moveBackLowerBody : M.moveBackFullBody,
  too_small: M.moveCloser,
  low_confidence: M.lowConfidence,
});

const CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

export default function TrackedExerciseSession({ ex, prescribed, trackerFactory, onClose, onFinish }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const voiceCoachRef = useRef(createVoiceCoach());
  const orientation = TRACKER_CAMERA_ORIENTATION[ex.id] || "frontal";
  // What must be in frame: 'lower' (pelvis + lower limb) for bridging, else the near-side body.
  const region = TRACKER_FRAMING_REGION[ex.id] || "whole";
  const FRAMING_MESSAGE = framingMessages(region);
  const targetReps = parseRepsTarget(prescribed ? prescribed.reps : ex.reps);
  // Smoothing + framing verdict + "Let's get started in 3, 2, 1" + tracker — one instance per session.
  const sessionRef = useRef(null);
  if (!sessionRef.current) sessionRef.current = createLiveSession({ trackerFactory, orientation, region, targetReps });
  // finish() runs from inside the camera loop, whose closure is frozen at the
  // render the effect started in — so it must read live values from refs, not state.
  const repsRef = useRef(0);
  const elapsedRef = useRef(0);
  const setupTip = region === "lower"
    ? M.cameraSetupTipLowerBody
    : orientation === "side" ? M.cameraSetupTipSide : M.cameraSetupTipFrontal;

  const [status, setStatus] = useState("loading"); // loading | ready | denied | error
  const [running, setRunning] = useState(true);
  const [reps, setReps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState([]);
  // Stable (debounced) framing status: initializing | ok | no_person | cut_off | too_small | low_confidence
  const [framing, setFraming] = useState("initializing");
  const [armed, setArmed] = useState(false); // the camera has seen a good setup
  const [countdown, setCountdown] = useState(null); // 3 | 2 | 1 while "Let's get started in…" runs, else null
  const [started, setStarted] = useState(false);    // counting begins only after the countdown ("Go")
  const [hint, setHint] = useState(null);    // e.g. 'calibrating'

  const [voiceOn, setVoiceOn] = useState(voiceCoachRef.current.isSupported());
  const [voiceLang, setVoiceLang] = useState("en"); // 'en' | 'hi'

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const landmarker = await getLandmarker();
        if (cancelled) return;

        setStatus("ready");
        startRef.current = Date.now();
        loop(landmarker);
      } catch (err) {
        if (cancelled) return;
        setStatus(err && err.name === "NotAllowedError" ? "denied" : "error");
      }
    }

    function loop(landmarker) {
      let consecutiveErrors = 0;
      let lastVideoTime = -1;
      function frame() {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        // Only run the model on NEW video frames. rAF fires at the display
        // rate (60-120 Hz) but the camera delivers ~30; re-running on the same
        // frame wastes CPU/battery for identical landmarks.
        if (video && canvas && video.readyState >= 2 && running && video.currentTime !== lastVideoTime) {
          lastVideoTime = video.currentTime;
          try {
            const nowMs = Date.now();
            const result = landmarker.detectForVideo(video, performance.now());
            const rawLandmarks = result.landmarks && result.landmarks[0];
            consecutiveErrors = 0;

            // One call does smoothing, framing, the "Let's get started in 3, 2, 1"
            // countdown and the tracker (liveSession.js). Nothing counts until Go.
            const r = sessionRef.current.process(rawLandmarks, nowMs, { aspect: video.videoWidth / video.videoHeight });
            drawOverlay(canvas, video, r.landmarks);
            setFraming(r.framing.status);
            setArmed(r.armed);
            setCountdown(r.countdown);
            setStarted(r.started);
            if (r.started) {
              repsRef.current = r.reps;
              elapsedRef.current = r.elapsed;
              setReps(r.reps);
              setFeedback(r.feedback);
              setHint(r.hint);
              setElapsed(r.elapsed);
            }

            // Speak what happened this frame. Framing prompts are already debounced
            // + capped (needs ~1.5 s of a real problem; max 3 spoken, >= 15 s apart),
            // so a single bad frame can no longer nag "move back".
            for (const ev of r.events) speakEvent(ev);

            if (r.finished) {
              finish();
              return;
            }
          } catch (err) {
            consecutiveErrors++;
            if (consecutiveErrors > 30) { // roughly 1 second of continuous failures
              setStatus("error");
              return;
            }
          }
        }
        rafRef.current = requestAnimationFrame(frame);
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      voiceCoachRef.current.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    voiceCoachRef.current.setEnabled(voiceOn);
  }, [voiceOn]);

  useEffect(() => {
    voiceCoachRef.current.setLanguage(voiceLang);
  }, [voiceLang]);

  // Turn a liveSession event into speech (see liveSession.js for the event list).
  function speakEvent(ev) {
    const voice = voiceCoachRef.current;
    if (ev.type === "countdown") {
      const n = { voiceEn: numberWord(ev.number, "en"), voiceHi: numberWord(ev.number, "hi") };
      // The first number is spoken as "Let's get started in three"; then just "Two", "One".
      const msg = ev.announce === "start"
        ? { voiceEn: `${M.letsGetStarted.voiceEn} ${n.voiceEn}`, voiceHi: `${M.letsGetStarted.voiceHi}, ${n.voiceHi}` }
        : n;
      voice.speak(msg, `countdown-${ev.number}`);
    } else if (ev.type === "go") {
      voice.speak(M.goCue, "countdown-go");
    } else if (ev.type === "rep") {
      // Always announce the count out loud on every completed rep — the whole
      // point if you're not looking at the screen. Fold in a correction too when
      // one's active that rep, same utterance.
      const num = numberWord(ev.count, "en"), numHi = numberWord(ev.count, "hi");
      const c = ev.correction;
      voice.speak(
        c ? { voiceEn: `${num}. ${c.voiceEn}`, voiceHi: `${numHi}. ${c.voiceHi}` } : { voiceEn: num, voiceHi: numHi },
        `rep-${ev.count}`
      );
    } else if (ev.type === "framing") {
      const msg = FRAMING_MESSAGE[ev.status];
      if (msg) voice.speak(msg, `framing-${ev.status}`);
    }
  }

  function drawOverlay(canvas, video, landmarks) {
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // mirror to match a selfie-style camera preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (landmarks) {
      // Low-visibility joints are the model GUESSING (e.g. the far leg hidden
      // behind the near one) — draw them faint so nobody reads them as fact.
      const conf = (p) => (p && (p.visibility ?? 1) >= 0.5);
      ctx.lineWidth = 4;
      CONNECTIONS.forEach(([a, b]) => {
        const p1 = landmarks[a], p2 = landmarks[b];
        if (!p1 || !p2) return;
        ctx.strokeStyle = conf(p1) && conf(p2) ? "#7C3AED" : "rgba(124,58,237,0.25)";
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      });
      landmarks.forEach((p) => {
        ctx.fillStyle = conf(p) ? "#7C3AED" : "rgba(124,58,237,0.25)";
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  function finish() {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onFinish({
      sets: prescribed ? prescribed.sets : ex.sets,
      duration: elapsedRef.current,
      reps: repsRef.current,
      formFeedback: sessionRef.current.tracker.getFeedback(),
    });
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 gap-2">
        <p className="font-semibold text-gray-900 text-sm truncate">{ex.name} · Live Tracking</p>
        <div className="flex items-center gap-2 shrink-0">
          {voiceCoachRef.current.isSupported() && (
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
              <button
                onClick={() => { setVoiceOn(true); setVoiceLang("en"); }}
                className={`px-2 py-1 rounded-full text-[10px] font-semibold ${voiceOn && voiceLang === "en" ? "bg-white shadow-sm text-violet-700" : "text-gray-400"}`}
              >
                EN
              </button>
              <button
                onClick={() => { setVoiceOn(true); setVoiceLang("hi"); }}
                className={`px-2 py-1 rounded-full text-[10px] font-semibold ${voiceOn && voiceLang === "hi" ? "bg-white shadow-sm text-violet-700" : "text-gray-400"}`}
              >
                हिं
              </button>
              <button
                onClick={() => setVoiceOn(false)}
                className={`px-1.5 py-1 rounded-full ${!voiceOn ? "bg-white shadow-sm text-gray-700" : "text-gray-400"}`}
                aria-label="Mute voice coach"
              >
                <VolumeX size={12} />
              </button>
            </div>
          )}
          <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
        </div>
      </div>

      <div className="relative flex-1 bg-black">
        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas ref={canvasRef} className="w-full h-full object-cover" />

        {status !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white text-center px-6">
            {status === "loading" && <p className="text-sm text-gray-300">Starting camera…</p>}
            {status === "denied" && (
              <>
                <AlertTriangle size={22} className="text-amber-400" />
                <p className="text-sm">Camera access was denied.</p>
                <p className="text-xs text-gray-400">Enable camera access for this site, then reopen the exercise.</p>
              </>
            )}
            {status === "error" && (
              <>
                <AlertTriangle size={22} className="text-amber-400" />
                <p className="text-sm">Couldn't start live tracking.</p>
              </>
            )}
            <button
              onClick={() => onFinish({ sets: prescribed ? prescribed.sets : ex.sets, duration: 0, reps: 0, formFeedback: null })}
              className="mt-2 text-xs text-gray-300 underline"
            >
              Skip camera tracking, log manually
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute top-3 left-3 right-3">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">{formatTime(elapsed)}</span>
              <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">{reps} / {targetReps} reps</span>
            </div>
            <div className="bg-black/40 text-white text-[11px] px-3 py-1.5 rounded-xl text-center leading-snug">
              <span className="block">{setupTip.en}</span>
              <span className="block text-gray-300" lang="hi">{setupTip.hi}</span>
            </div>
          </div>
        )}

        {/* Not armed yet: nothing is counted until the camera sees you clearly. */}
        {status === "ready" && !armed && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/70 text-white text-xs px-3 py-2 rounded-xl text-center">
            <span className="block font-medium">{M.getInPosition.en}</span>
            <span className="block text-gray-300" lang="hi">{M.getInPosition.hi}</span>
            {FRAMING_MESSAGE[framing] && (
              <span className="block mt-1 text-amber-300">{FRAMING_MESSAGE[framing].en}</span>
            )}
          </div>
        )}

        {/* Armed but the view has been bad for ~1.5 s (debounced — never a single-frame flash). */}
        {status === "ready" && armed && FRAMING_MESSAGE[framing] && (
          <div className={`absolute bottom-3 left-3 right-3 text-white text-xs px-3 py-2 rounded-xl text-center ${framing === "no_person" ? "bg-rose-600/90" : "bg-amber-600/90"}`}>
            <span className="block font-medium">{FRAMING_MESSAGE[framing].en}</span>
            <span className="block" lang="hi">{FRAMING_MESSAGE[framing].hi}</span>
          </div>
        )}

        {/* The camera can see you: "Let's get started in 3, 2, 1". Nothing counts until Go. */}
        {status === "ready" && armed && !started && countdown !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-white text-center">
            <span className="bg-black/60 text-sm px-4 py-2 rounded-full mb-2">{M.letsGetStarted.en}</span>
            <span className="text-[7rem] leading-none font-bold drop-shadow-lg">{countdown}</span>
            <span className="text-xs text-gray-200 mt-2" lang="hi">{M.letsGetStarted.hi}</span>
          </div>
        )}

        {status === "ready" && started && elapsed === 0 && reps === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-7xl font-bold text-white drop-shadow-lg">{M.goCue.en}</span>
          </div>
        )}

        {status === "ready" && started && !FRAMING_MESSAGE[framing] && hint === "calibrating" && reps === 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-xl text-center">
            <span className="block">{M.holdStill.en}</span>
            <span className="block text-gray-300" lang="hi">{M.holdStill.hi}</span>
          </div>
        )}

        {status === "ready" && armed && !FRAMING_MESSAGE[framing] && hint !== "calibrating" && feedback.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-xl text-center">
            <span className="block">{feedback[0].en}</span>
            <span className="block text-gray-300" lang="hi">{feedback[0].hi}</span>
          </div>
        )}
      </div>

      {status === "ready" && (
        <div className="p-4 flex items-center gap-3 shrink-0">
          <button onClick={() => setRunning((r) => !r)} className="flex-1 flex items-center justify-center gap-1.5 bg-gray-100 text-gray-700 text-sm font-medium py-3 rounded-xl">
            {running ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Resume</>}
          </button>
          <button onClick={finish} className="flex-1 bg-violet-600 text-white text-sm font-semibold py-3 rounded-xl">
            Finish
          </button>
        </div>
      )}
    </div>
  );
}
