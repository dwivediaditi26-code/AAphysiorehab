// Air-gesture "point at a button and hold" control — verification harness.
//   node test-air-pointer.mjs        (also run by `npm test`)
//
// Two pure, DOM-free modules: airPointer.js (which hand is "pointing", and
// dwell-to-activate zone selection) and screenMapping.js (mirrored,
// object-cover coordinate math). AirPointerOverlay.jsx just wires these to
// real DOM refs and isn't exercised here — no jsdom in this project.
import { findPointingHand, createDwellSelector } from "./src/lib/airPointer.js";
import { mapLandmarkToScreen, rectToZone } from "./src/lib/screenMapping.js";

const results = [];
function check(name, ok, detail = "") {
  results.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  →  " + detail : ""}`);
}
const near = (a, b, tol = 0.01) => Math.abs(a - b) < tol;

// A 33-point landmark array, all at a plausible resting position, nose visible.
function baseLandmarks() {
  const a = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.6, z: 0, visibility: 1 }));
  a[0] = { x: 0.5, y: 0.3, z: 0, visibility: 1 };   // nose
  a[15] = { x: 0.4, y: 0.55, z: 0, visibility: 1 }; // left wrist, below nose (resting)
  a[16] = { x: 0.6, y: 0.55, z: 0, visibility: 1 }; // right wrist, below nose (resting)
  return a;
}

// ---------------------------------------------------------------- findPointingHand
console.log("\n--- findPointingHand: a raised wrist becomes a pointing hand, a resting one never does ---\n");
{
  check("No landmarks -> null", findPointingHand(null) === null);
  check("Too few landmarks -> null", findPointingHand([{ x: 0.5, y: 0.5, visibility: 1 }]) === null);

  const l = baseLandmarks();
  check("Neither wrist above the nose -> null (this is the normal resting state)", findPointingHand(l) === null);

  const lowNose = baseLandmarks(); lowNose[0].visibility = 0.2;
  check("Nose not confidently seen -> null (can't judge 'above the head' without it)", findPointingHand(lowNose) === null);

  const leftUp = baseLandmarks(); leftUp[15].y = 0.1; // above the nose (y=0.3)
  const hand1 = findPointingHand(leftUp);
  check("Left wrist raised above the nose -> that wrist's position", hand1 && near(hand1.x, 0.4) && near(hand1.y, 0.1), JSON.stringify(hand1));

  const rightUp = baseLandmarks(); rightUp[16].y = 0.15;
  const hand2 = findPointingHand(rightUp);
  check("Right wrist raised above the nose -> that wrist's position", hand2 && near(hand2.x, 0.6) && near(hand2.y, 0.15), JSON.stringify(hand2));

  const bothUp = baseLandmarks(); bothUp[15].y = 0.15; bothUp[16].y = 0.05; // right higher
  const hand3 = findPointingHand(bothUp);
  check("Both raised -> picks the one raised HIGHER (smaller y)", hand3 && near(hand3.x, 0.6) && near(hand3.y, 0.05), JSON.stringify(hand3));

  const lowVis = baseLandmarks(); lowVis[15].y = 0.1; lowVis[15].visibility = 0.1;
  check("Raised but low-confidence wrist -> not trusted, null", findPointingHand(lowVis) === null);

  const custom = baseLandmarks(); custom[15].y = 0.1; custom[15].visibility = 0.4;
  check("minVisibility is configurable", findPointingHand(custom, { minVisibility: 0.3 }) !== null && findPointingHand(custom, { minVisibility: 0.5 }) === null);
}

// ---------------------------------------------------------------- createDwellSelector
console.log("\n--- createDwellSelector: hold over a zone to activate it, without misfiring ---\n");
const ZONES = [
  { id: "pause", x0: 0, y0: 0, x1: 100, y1: 100 },
  { id: "finish", x0: 200, y0: 0, x1: 300, y1: 100 },
];
{
  const sel = createDwellSelector({ holdMs: 900 });
  let r = sel.update(null, ZONES, 0);
  check("No point -> nothing hovered, 0 progress", r.overZoneId === null && r.progress === 0 && r.activatedZoneId === null);

  r = sel.update({ x: -50, y: -50 }, ZONES, 100);
  check("Point outside every zone -> nothing hovered", r.overZoneId === null);

  r = sel.update({ x: 50, y: 50 }, ZONES, 0);
  check("Enters a zone -> hover starts at 0 progress", r.overZoneId === "pause" && r.progress === 0);
  r = sel.update({ x: 50, y: 50 }, ZONES, 450);
  check("Halfway through the hold -> ~50% progress", r.overZoneId === "pause" && near(r.progress, 0.5, 0.02), `progress ${r.progress}`);
  r = sel.update({ x: 50, y: 50 }, ZONES, 890);
  check("Just under the hold time -> not yet activated", r.activatedZoneId === null);
  r = sel.update({ x: 50, y: 50 }, ZONES, 900);
  check("Reaches the hold time -> activates exactly once", r.activatedZoneId === "pause");
  r = sel.update({ x: 50, y: 50 }, ZONES, 1500);
  check("Lingering on the same zone afterward -> does not re-activate", r.overZoneId === "pause" && r.activatedZoneId === null);

  r = sel.update(null, ZONES, 1600);
  r = sel.update({ x: 50, y: 50 }, ZONES, 1700);
  r = sel.update({ x: 50, y: 50 }, ZONES, 2600);
  check("Leaving and coming back lets it activate again", r.activatedZoneId === "pause");
}
{
  const sel = createDwellSelector({ holdMs: 900 });
  sel.update({ x: 50, y: 50 }, ZONES, 0);
  const activated = sel.update({ x: 50, y: 50 }, ZONES, 900);
  check("Setup: 'pause' just activated", activated.activatedZoneId === "pause");
  const moved = sel.update({ x: 250, y: 50 }, ZONES, 950); // straight to 'finish'
  check("Moving straight to a DIFFERENT zone starts a fresh dwell (no carried-over progress)", moved.overZoneId === "finish" && near(moved.progress, 0, 0.02), `progress ${moved.progress}`);
  const finishActivates = sel.update({ x: 250, y: 50 }, ZONES, 950 + 900);
  check("...and it activates on its OWN full hold, independent of 'pause'", finishActivates.activatedZoneId === "finish");
}
{
  const sel = createDwellSelector({ holdMs: 900 });
  sel.update({ x: 50, y: 50 }, ZONES, 0);
  const r1 = sel.update({ x: 50, y: 50 }, ZONES, 400);
  check("Progress builds while hovering", r1.progress > 0);
  const r2 = sel.update(null, ZONES, 500); // hand drops mid-dwell
  check("Point going null mid-dwell resets progress", r2.progress === 0 && r2.overZoneId === null);
  sel.update({ x: 50, y: 50 }, ZONES, 600);
  const r3 = sel.update({ x: 50, y: 50 }, ZONES, 600 + 900);
  check("...and a fresh, full hold afterward still activates", r3.activatedZoneId === "pause");
}
{
  const sel = createDwellSelector({ holdMs: 900 });
  sel.update({ x: 50, y: 50 }, ZONES, 0);
  sel.update({ x: 50, y: 50 }, ZONES, 900);
  sel.reset();
  const r = sel.update({ x: 50, y: 50 }, ZONES, 950);
  check("reset() clears the just-activated latch and dwell state", r.overZoneId === "pause" && r.progress < 0.1 && r.activatedZoneId === null, `progress ${r.progress}`);
}

// ---------------------------------------------------------------- mapLandmarkToScreen
console.log("\n--- mapLandmarkToScreen: mirrored, object-cover mapping matches what the patient sees ---\n");
{
  check("Null point -> null", mapLandmarkToScreen(null, 100, 100, { left: 0, top: 0, width: 100, height: 100 }) === null);
  check("Missing container size -> null", mapLandmarkToScreen({ x: 0.5, y: 0.5 }, 100, 100, { left: 0, top: 0, width: 0, height: 0 }) === null);

  // Square video into a same-size container: no crop, scale 1. Mirroring only.
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  const p1 = mapLandmarkToScreen({ x: 0.3, y: 0.4 }, 100, 100, rect);
  check("Mirrored horizontally: camera-space x=0.3 (its own left) lands on the RIGHT side of the screen", near(p1.x, 70) && near(p1.y, 40), JSON.stringify(p1));
  const p2 = mapLandmarkToScreen({ x: 0.5, y: 0.5 }, 100, 100, rect);
  check("Camera-space center maps to container center, regardless of mirroring", near(p2.x, 50) && near(p2.y, 50));

  // Offset container (simulating page position / scroll).
  const p3 = mapLandmarkToScreen({ x: 0.5, y: 0.5 }, 100, 100, { left: 20, top: 10, width: 100, height: 100 });
  check("Container offset (left/top) is carried through", near(p3.x, 70) && near(p3.y, 60), JSON.stringify(p3));

  // Wide video (16:9) into a narrower/taller container: object-cover crops the sides.
  const wideRect = { left: 50, top: 20, width: 400, height: 400 };
  const p4 = mapLandmarkToScreen({ x: 0, y: 0 }, 1600, 900, wideRect);
  check("Wide video cropped to a square container: the far-left camera edge falls outside the visible container (real object-cover crop)", near(p4.x, 605.56, 0.1) && near(p4.y, 20, 0.1), JSON.stringify(p4));

  // Tall/portrait video into a wide/short container: object-cover crops top/bottom.
  const tallRect = { left: 0, top: 0, width: 400, height: 400 };
  const p5 = mapLandmarkToScreen({ x: 0.5, y: 0 }, 900, 1600, tallRect);
  check("Portrait video cropped to a square container: the top camera edge falls above the visible container", near(p5.x, 200, 0.1) && near(p5.y, -155.56, 0.1), JSON.stringify(p5));
}
{
  const zone = rectToZone("pause", { left: 10, top: 20, right: 110, bottom: 220 });
  check("rectToZone maps a DOMRect-shaped object straight through", zone.id === "pause" && zone.x0 === 10 && zone.y0 === 20 && zone.x1 === 110 && zone.y1 === 220, JSON.stringify(zone));
}

// ---------------------------------------------------------------- end to end
console.log("\n--- End to end: raise a hand, hold it over a real button rect, and only that fires ---\n");
{
  // A container the same size as the video (no crop/scale) for simple numbers,
  // with a Pause button rect at container-relative (0,0)-(100,60).
  const containerRect = { left: 0, top: 0, width: 300, height: 300 };
  const pauseZone = rectToZone("pause", { left: 0, top: 0, right: 100, bottom: 60 });
  const otherZone = rectToZone("finish", { left: 200, top: 0, right: 300, bottom: 60 });
  const zones = [pauseZone, otherZone];
  const sel = createDwellSelector({ holdMs: 900 });

  // Normal exercise motion — wrist never above the nose — must never activate anything,
  // even while it happens to sit where the Pause button lives on screen.
  const resting = baseLandmarks();
  let r = null;
  for (let t = 0; t <= 1200; t += 100) {
    const hand = findPointingHand(resting);
    const screen = hand ? mapLandmarkToScreen(hand, 100, 100, containerRect) : null;
    r = sel.update(screen, zones, t);
  }
  check("Normal exercise movement (no raised hand) never activates a button, even after 1.2s", r.activatedZoneId === null && r.overZoneId === null);

  // Deliberately raise a hand toward where "Pause" renders on screen and hold it.
  sel.reset();
  const raised = baseLandmarks();
  // camera-space (0.75, 0.1), mirrored by mapLandmarkToScreen -> screen x = 100*(1-0.75)=25, y=10 -> inside pauseZone (0-100, 0-60)
  raised[15].x = 0.75; raised[15].y = 0.1;
  for (let t = 0; t < 900; t += 100) {
    const hand = findPointingHand(raised);
    const screen = mapLandmarkToScreen(hand, 100, 100, containerRect);
    r = sel.update(screen, zones, t);
  }
  check("Held under the hold time -> not activated yet", r.activatedZoneId === null && r.overZoneId === "pause");
  const hand = findPointingHand(raised);
  const screen = mapLandmarkToScreen(hand, 100, 100, containerRect);
  r = sel.update(screen, zones, 900);
  check("Held for the full ~1s over the mapped screen position of the Pause button -> Pause activates, not Finish", r.activatedZoneId === "pause");
}

const failed = results.filter((r) => !r).length;
console.log(`\n${failed === 0 ? `All ${results.length} air-pointer checks passed.` : `${failed} of ${results.length} air-pointer checks FAILED.`}\n`);
process.exit(failed === 0 ? 0 : 1);
