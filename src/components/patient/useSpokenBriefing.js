import { useCallback, useEffect, useRef, useState } from "react";
import { buildBriefing, createGuideMemory } from "../../lib/guideScript.js";

/**
 * Plays the spoken first-time guide (guideScript.js) once, as soon as the
 * camera is ready, and tells the screen which line is being said so the text
 * can be shown alongside.
 *
 *   line       { index, total, message } while a line is being spoken, else null
 *   activeRef  true until the guide has finished or been skipped — the screen
 *              reads it every frame to hold back the "3, 2, 1" and any counting
 *   skip()     cut the guide short ("Skip" button)
 *
 * With the voice off or unsupported nothing is spoken and the guide is over at
 * once (the written set-up tip is still on screen); that does NOT count as the
 * patient having heard it, so the full version plays next time.
 * `onDone` fires once when the guide ends for any reason (not after unmount).
 */
export function useSpokenBriefing({ voiceCoachRef, status, ex, targetReps, isHold = false, holdSeconds, holds, onDone }) {
  const [line, setLine] = useState(null);
  const activeRef = useRef(true);
  const startedRef = useRef(false);
  const skippedRef = useRef(false);
  const aliveRef = useRef(true);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => () => { aliveRef.current = false; }, []);

  useEffect(() => {
    if (status !== "ready" || startedRef.current) return;
    startedRef.current = true;
    const memory = createGuideMemory();
    const lines = buildBriefing({ ex, targetReps, isHold, holdSeconds, holds, full: memory.needsFullGuide(ex.id) });
    voiceCoachRef.current.speakSequence(lines, {
      onLine: (index, message) => { if (aliveRef.current) setLine({ index, total: lines.length, message }); },
      onDone: (completed) => {
        activeRef.current = false;
        if (completed || skippedRef.current) memory.markGuided(ex.id);
        if (!aliveRef.current) return;
        setLine(null);
        if (onDoneRef.current) onDoneRef.current();
      },
    });
  }, [status]);

  const skip = useCallback(() => {
    skippedRef.current = true;
    voiceCoachRef.current.cancelSequence();
  }, [voiceCoachRef]);

  return { line, activeRef, skip };
}
