import React, { useEffect, useRef, useState } from "react";
import { findPointingHand, createDwellSelector } from "../../lib/airPointer.js";
import { mapLandmarkToScreen, rectToZone } from "../../lib/screenMapping.js";

/**
 * "Point at a button and hold" hands-free control, shared by both live
 * tracking screens (TrackedExerciseSession.jsx, HoldTrackedExerciseSession.jsx)
 * — useful when the phone is propped up out of reach, which is most floor
 * exercises. Raise a hand above your head (see airPointer.js for why that's
 * the bar) and it becomes an on-screen cursor; hold it over a button for
 * ~1s to activate it, same as tapping it.
 *
 * This component is the DOM wiring only — reads real button rects each
 * frame and renders the cursor — the gesture/dwell logic (airPointer.js) and
 * the mirrored, object-cover coordinate math (screenMapping.js) are both
 * pure and unit-tested on their own.
 *
 * Props:
 *   containerRef  ref to the relatively-positioned video container
 *   videoRef      ref to the <video> element (read for its live pixel size)
 *   landmarks     this frame's (smoothed) landmarks array, or null
 *   zones         [{ id, ref, onActivate }] — ref points at the real button
 *   enabled       false hides the cursor and stops tracking entirely
 */
export default function AirPointerOverlay({ containerRef, videoRef, landmarks, zones, enabled }) {
  const selectorRef = useRef(null);
  if (!selectorRef.current) selectorRef.current = createDwellSelector();
  const [cursor, setCursor] = useState(null); // {x,y} in viewport pixels, or null
  const [hover, setHover] = useState({ zoneId: null, progress: 0 });

  useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current, video = videoRef.current;
    if (!container || !video || !video.videoWidth || !video.videoHeight) return;

    const hand = findPointingHand(landmarks);
    const containerRect = container.getBoundingClientRect();
    const screenPoint = hand ? mapLandmarkToScreen(hand, video.videoWidth, video.videoHeight, containerRect) : null;
    setCursor(screenPoint);

    const zoneRects = zones
      .map((z) => (z.ref.current ? rectToZone(z.id, z.ref.current.getBoundingClientRect()) : null))
      .filter(Boolean);
    const result = selectorRef.current.update(screenPoint, zoneRects);
    setHover({ zoneId: result.overZoneId, progress: result.progress });
    if (result.activatedZoneId) {
      const zone = zones.find((z) => z.id === result.activatedZoneId);
      if (zone) zone.onActivate();
    }
  }, [landmarks, enabled]);

  useEffect(() => {
    if (!enabled) { selectorRef.current.reset(); setCursor(null); setHover({ zoneId: null, progress: 0 }); }
  }, [enabled]);

  if (!enabled || !cursor) return null;

  const R = 28; // cursor ring radius, px
  const CIRC = 2 * Math.PI * 42;
  return (
    <div
      className="fixed pointer-events-none z-50 transition-[left,top] duration-75"
      style={{ left: cursor.x - R, top: cursor.y - R, width: R * 2, height: R * 2 }}
    >
      <svg width={R * 2} height={R * 2} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r="42" strokeWidth="10" fill="rgba(17,17,17,0.35)" className="stroke-white/60" />
        {hover.zoneId && (
          <circle
            cx="50" cy="50" r="42" strokeWidth="10" fill="none"
            className="stroke-violet-400"
            strokeDasharray={CIRC}
            strokeDashoffset={CIRC * (1 - hover.progress)}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}
