import React, { useEffect, useRef, useState } from "react";
import { X, Pause, Play, AlertTriangle } from "lucide-react";
import { parseRepsTarget } from "../../lib/helpers.js";

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

// Cache the vision fileset + landmarker across sessions so re-opening an exercise
// doesn't reload the ~ several-MB wasm/model payload every time.
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
          delegate: "GPU",
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

export default function TrackedExerciseSession({ ex, prescribed, trackerFactory, onClose, onFinish }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const trackerRef = useRef(trackerFactory());
  const rafRef = useRef(null);
  const startRef = useRef(null);

  const [status, setStatus] = useState("loading"); // loading | ready | denied | error
  const [running, setRunning] = useState(true);
  const [reps, setReps] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState([]);

  const targetReps = parseRepsTarget(prescribed ? prescribed.reps : ex.reps);

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
      function frame() {
        if (cancelled) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2 && running) {
          const now = performance.now();
          const result = landmarker.detectForVideo(video, now);
          const landmarks = result.landmarks && result.landmarks[0];

          drawOverlay(canvas, video, landmarks);

          if (landmarks) {
            trackerRef.current.processFrame(landmarks, Date.now());
            const count = trackerRef.current.getRepCount();
            setReps(count);
            setFeedback(trackerRef.current.getFeedback());
            setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
            if (count >= targetReps) {
              finish();
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

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

  function finish() {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    onFinish({
      sets: prescribed ? prescribed.sets : ex.sets,
      duration: elapsed,
      reps,
      formFeedback: trackerRef.current.getFeedback(),
    });
  }

  function formatTime(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white shrink-0">
        <p className="font-semibold text-gray-900 text-sm">{ex.name} · Live Tracking</p>
        <button onClick={onClose} className="text-gray-400"><X size={18} /></button>
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
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
            <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">{formatTime(elapsed)}</span>
            <span className="bg-black/50 text-white text-xs px-3 py-1.5 rounded-full">{reps} / {targetReps} reps</span>
          </div>
        )}

        {status === "ready" && feedback.length > 0 && (
          <div className="absolute bottom-3 left-3 right-3 bg-black/60 text-white text-xs px-3 py-2 rounded-xl">
            {feedback[0]}
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
