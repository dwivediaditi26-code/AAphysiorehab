import React, { useEffect, useRef, useState } from "react";
import { X, Pause, Play, AlertTriangle, VolumeX } from "lucide-react";
import { parseHoldTargetMs } from "../../lib/helpers.js";
import { isWholeBodyInFrame, hasMinimalPose } from "../../lib/trackingMath.js";
import { FEEDBACK_MESSAGES as M } from "../../lib/feedbackMessages.js";
import { TRACKER_CAMERA_ORIENTATION } from "../../lib/trackedExercises.js";
import { createVoiceCoach } from "../../lib/voiceCoach.js";
import { numberWord } from "../../lib/numberWords.js";

/**
 * Real camera + MediaPipe Pose Landmarker session for HOLD-based exercises
 * (Side Plank, Front Plank, Adductor Squeeze) — same camera/MediaPipe/voice
 * plumbing as TrackedExerciseSession.jsx, but built around a timer gated on
 * staying in position (holdCounter.js) instead of a rep-counting phase
 * machine (repCounter.js). A "set" here means one completed hold at the
 * target duration, not one rep.
 *
 * Props: same shape as TrackedExerciseSession.jsx — ex, prescribed,
 * trackerFactory, onClose, onFinish({ sets, duration, reps, formFeedback }).
 * `reps` in onFinish is reused to report completed holds, so the existing
 * session-complete screen doesn't need special-casing.
 */

let landmarkerPromise = null;
async function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
      );
      return PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}

const CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

export default function HoldTrackedExerciseSession({ ex, prescribed, trackerFactory, onClose, onFinish }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const targetHoldMs = parseHoldTargetMs(prescribed ? prescribed.reps : ex.reps);
  const trackerRef = useRef(trackerFactory({ targetMs: targetHoldMs }));
  const rafRef = useRef(null);
  const startRef = useRef(null);
  const voiceCoachRef = useRef(createVoiceCoach());
  const wasHoldingRef = useRef(false);
  const lastAnnouncedSecRef = useRef(0);
  const orientation = TRACKER_CAMERA_ORIENTATION[ex.id] || "side";
  const setupTip = orientation === "side" ? M.cameraSetupTipSide : M.cameraSetupTipFrontal;

  const [status, setStatus] = useState("loading");
  const [running, setRunning] = useState(true);
  const [holdsDone, setHoldsDone] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState([]);
  const [framingOk, setFramingOk] = useState(true);
  const [personVisible, setPersonVisible] = useState(true);
  const [voiceOn, setVoiceOn] = useState(voiceCoachRef.current.isSupported());
  const [voiceLang, setVoiceLang] = useState("en");

  const targetHolds = prescribed ? prescribed.sets : ex.sets;

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
      function frame() {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2 && running) {
          try {
            const now = performance.now();
            const result = landmarker.detectForVideo(video, now);
            const landmarks = result.landmarks && result.landmarks[0];
            consecutiveErrors = 0;

            drawOverlay(canvas, video, landmarks);

            const trackable = hasMinimalPose(landmarks);
            const fullyFramed = isWholeBodyInFrame(landmarks);
            setFramingOk(fullyFramed);
            setPersonVisible(trackable);
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));

            if (trackable) {
              trackerRef.current.processFrame(landmarks, Date.now());
              const holding = trackerRef.current.isHolding();
              const curElapsedMs = trackerRef.current.getElapsedMs();
              const completedHolds = trackerRef.current.getCompletedHolds();
              const currentFeedback = trackerRef.current.getFeedback();

              setIsHolding(holding);
              setElapsedMs(curElapsedMs);
              setHoldsDone(completedHolds);
              setFeedback(currentFeedback);

              if (holding) {
                const sec = Math.floor(curElapsedMs / 1000);
                if (sec > 0 && sec % 5 === 0 && sec !== lastAnnouncedSecRef.current) {
                  lastAnnouncedSecRef.current = sec;
                  const w = numberWord(sec, "en"), wHi = numberWord(sec, "hi");
                  voiceCoachRef.current.speak({ voiceEn: w, voiceHi: wHi }, `holdsec-${sec}`);
                }
              } else {
                lastAnnouncedSecRef.current = 0;
              }

              if (wasHoldingRef.current && !holding && completedHolds === trackerRef.current.getCompletedHolds()) {
                // was holding, now isn't, and no new hold was just completed -> broke early
              }
              if (!holding && wasHoldingRef.current) {
                const brokeEarly = currentFeedback.some((f) => f === M.holdBroke);
                if (brokeEarly) voiceCoachRef.current.speak(M.holdBroke, "holdBroke");
              }
              wasHoldingRef.current = holding;

              if (!holding && !fullyFramed) {
                voiceCoachRef.current.speak(M.moveBackFullBody, "moveBack");
              }

              if (completedHolds >= targetHolds) {
                finish(completedHolds);
                return;
              }
            } else {
              voiceCoachRef.current.speak(M.noPersonDetected, "noPerson");
            }
          } catch (err) {
            consecutiveErrors++;
            if (consecutiveErrors > 30) {
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

  useEffect(() => { voiceCoachRef.current.setEnabled(voiceOn); }, [voiceOn]);
  useEffect(() => { voiceCoachRef.current.setLanguage(voiceLang); }, [voiceLang]);

  function drawOverlay(canvas, video, landmarks) {
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    if (landmarks) {
      ctx.strokeStyle = "#7C3AED";
      ctx.lineWidth = 4;
      CONNECTIONS.forEach(([a, b]) => {
        const p1 = landmarks[a], p2 = landmarks[b];
        if (!p1 || !p2) return;
        ctx.beginPath();
        ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
        ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
        ctx.stroke();
      });
      ctx.fillStyle = "#7C3AED";
      landmarks.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  function finish(finalHolds) {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onFinish({
      sets: finalHolds ?? holdsDone,
      duration: elapsed,
      reps: finalHolds ?? holdsDone,
      formFeedback: trackerRef.current.getFeedback(),
    });
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  const progressPct = Math.min(100, Math.round((elapsedMs / targetHoldMs) * 100));

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0 gap-2">
        <p className="font-semibold text-gray-900 text-sm truncate">{ex.name} · Live Tracking</p>
        <div className="flex items-center gap-2 shrink-0">
          {voiceCoachRef.current.isSupported() && (
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-full p-0.5">
              <button onClick={() => { setVoiceOn(true); setVoiceLang("en"); }} className={`px-2 py-1 rounded-full text-[10px] font-semibold ${voiceOn && voiceLang === "en" ? "bg-white shadow-sm text-violet-700" : "text-gray-400"}`}>EN</button>
              <button onClick={() => { setVoiceOn(true); setVoiceLang("hi"); }} className={`px-2 py-1 rounded-full text-[10px] font-semibold ${voiceOn && voiceLang === "hi" ? "bg-white shadow-sm text-violet-700" : "text-gray-400"}`}>हिं</button>
              <button onClick={() => setVoiceOn(false)} className={`px-1.5 py-1 rounded-full ${!voiceOn ? "bg-white shadow-sm text-gray-700" : "text-gray-400"}`} aria-label="Mute voice coach"><VolumeX size={12} /></button>
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
            <button onClick={() => onFinish({ sets: 0, duration: 0, reps: 0, formFeedback: null })} className="mt-2 text-xs text-gray-300 underline">
              Skip camera tracking, log manually
            </button>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute top-3 left-3 right-3">
            <div className="flex items-center justify-between mb-2">
              <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">{formatTime(elapsed)}</span>
              <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">{holdsDone} / {targetHolds} holds</span>
            </div>
            <div className="bg-black/40 text-white text-[11px] px-3 py-1.5 rounded-xl text-center leading-snug">
              <span className="block">{setupTip.en}</span>
              <span className="block text-gray-300" lang="hi">{setupTip.hi}</span>
            </div>
          </div>
        )}

        {status === "ready" && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-36 h-36">
              <svg width="100%" height="100%" viewBox="0 0 100 100" className="-rotate-90">
                <circle cx="50" cy="50" r="44" strokeWidth="7" fill="none" className="stroke-white/20" />
                <circle
                  cx="50" cy="50" r="44" strokeWidth="7" fill="none"
                  className={isHolding ? "stroke-violet-400" : "stroke-white/40"}
                  strokeDasharray={2 * Math.PI * 44}
                  strokeDashoffset={2 * Math.PI * 44 * (1 - progressPct / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.2s linear" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <span className="text-2xl font-bold">{Math.floor(elapsedMs / 1000)}s</span>
                <span className="text-[10px] text-gray-300">of {Math.round(targetHoldMs / 1000)}s</span>
                {!isHolding && <span className="text-[10px] text-amber-300 mt-1">get in position</span>}
              </div>
            </div>
          </div>
        )}

        {status === "ready" && !personVisible && (
          <div className="absolute bottom-3 left-3 right-3 bg-rose-600/90 text-white text-xs px-3 py-2 rounded-xl text-center">
            <span className="block font-medium">{M.noPersonDetected.en}</span>
            <span className="block" lang="hi">{M.noPersonDetected.hi}</span>
          </div>
        )}

        {status === "ready" && personVisible && !framingOk && !isHolding && (
          <div className="absolute bottom-3 left-3 right-3 bg-amber-600/90 text-white text-xs px-3 py-2 rounded-xl text-center">
            <span className="block font-medium">{M.moveBackFullBody.en}</span>
            <span className="block" lang="hi">{M.moveBackFullBody.hi}</span>
          </div>
        )}

        {status === "ready" && personVisible && feedback.length > 0 && (framingOk || isHolding) && (
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
          <button onClick={() => finish()} className="flex-1 bg-violet-600 text-white text-sm font-semibold py-3 rounded-xl">
            Finish
          </button>
        </div>
      )}
    </div>
  );
}
