/**
 * Maps a normalized (0..1) landmark point — as MediaPipe reports it, i.e. in
 * the camera's own, UNMIRRORED left/right — to real screen pixel
 * coordinates matching what the patient actually sees, which is:
 *
 *   - rendered with CSS `object-cover` inside the video/canvas's box
 *     (internal resolution is videoW x videoH, usually a different aspect
 *     ratio than the box, so object-cover scales up and crops the
 *     overflow, exactly like <video>/<img> object-fit: cover)
 *   - MIRRORED horizontally (selfie view) — both session screens' own
 *     drawOverlay() does ctx.translate(canvas.width,0); ctx.scale(-1,1)
 *     before drawing, and this must match that exactly or the on-screen
 *     cursor won't track a hand the patient can see reaching for a button.
 *
 * Pure math, no DOM — `containerRect` is whatever getBoundingClientRect()
 * returned (or an equivalent {left, top, width, height}), so this is fully
 * unit-testable with plain numbers.
 */
export function mapLandmarkToScreen(point, videoW, videoH, containerRect) {
  if (!point || !videoW || !videoH || !containerRect || !containerRect.width || !containerRect.height) return null;

  const scale = Math.max(containerRect.width / videoW, containerRect.height / videoH);
  const renderedW = videoW * scale, renderedH = videoH * scale;
  const cropX = (renderedW - containerRect.width) / 2;
  const cropY = (renderedH - containerRect.height) / 2;

  const px = point.x * renderedW, py = point.y * renderedH;
  return {
    x: containerRect.left + (renderedW - px) - cropX, // mirrored: right in camera space = left on screen
    y: containerRect.top + py - cropY,
  };
}

/** A DOM rect (from getBoundingClientRect()) as a createDwellSelector zone. */
export function rectToZone(id, rect) {
  return { id, x0: rect.left, y0: rect.top, x1: rect.right, y1: rect.bottom };
}
