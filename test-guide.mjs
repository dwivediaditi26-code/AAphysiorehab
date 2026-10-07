// The spoken guide: what a first-time patient is told (camera placement and
// distance, what the exercise is, how many, how it is done), the callouts during
// the set (count, how many left, encouragement, a finish line), and the speech
// plumbing that keeps it from being cut off. Run:
//   node test-guide.mjs
//
// Speech is tested against a FAKE speechSynthesis (no audio in node), so these
// prove the order, timing and cancellation logic — not how any real device's
// Hindi voice sounds. Have a Hindi speaker listen to the real thing.
import {
  buildBriefing, repCallout, holdTick, holdDoneCallout, createGuideMemory, exerciseNames,
} from "./src/lib/guideScript.js";
import { createVoiceCoach, preferredVoiceLang, rememberVoiceLang } from "./src/lib/voiceCoach.js";
import { createLiveSession } from "./src/lib/liveSession.js";
import {
  TRACKED_EXERCISE_COMPONENTS, HOLD_TRACKED_EXERCISES, TRACKER_POSTURE, TRACKER_CAMERA_ORIENTATION,
  TRACKER_FRAMING_REGION, cameraSetupTip,
} from "./src/lib/trackedExercises.js";
import { FEEDBACK_MESSAGES as M } from "./src/lib/feedbackMessages.js";
import { EXERCISES_SEED, getInstructions } from "./src/data/seed.js";

let passed = 0, failed = 0;
function check(name, cond, detail = "") {
  if (cond) { passed++; console.log(`PASS  ${name}${detail ? "  →  " + detail : ""}`); }
  else { failed++; console.log(`FAIL  ${name}${detail ? "  →  " + detail : ""}`); }
}
const section = (t) => console.log(`\n--- ${t} ---\n`);
const dev = /[ऀ-ॿ]/;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const exById = (id) => EXERCISES_SEED.find((e) => e.id === id);

// ================================================================ 1
section("Camera placement: distance and what must be in view, per exercise");
{
  const all = [...Object.keys(TRACKED_EXERCISE_COMPONENTS), ...Object.keys(HOLD_TRACKED_EXERCISES)];
  check("Every tracked exercise has a posture on record", all.every((id) => TRACKER_POSTURE[id]), all.filter((id) => !TRACKER_POSTURE[id]).join(","));
  check("Every set-up tip says how far away to put the phone (English and Hindi)",
    all.every((id) => { const t = cameraSetupTip(id); return /feet|arm's length/i.test(t.en) && /फ़ुट|हाथ की दूरी/.test(t.hi); }),
    all.filter((id) => { const t = cameraSetupTip(id); return !(/feet|arm's length/i.test(t.en) && /फ़ुट|हाथ की दूरी/.test(t.hi)); }).join(","));
  check("...and what has to be in view", all.every((id) => /in view/i.test(cameraSetupTip(id).en) && /दिख/.test(cameraSetupTip(id).hi)));
  check("...and a spoken version in both languages", all.every((id) => { const t = cameraSetupTip(id); return t.voiceEn && dev.test(t.voiceHi); }));
  const standingSide = cameraSetupTip("e13");
  check("Shoulder Flexion (standing, side-on) is told to STAND side-on, not to lie down", standingSide === M.cameraSetupTipStandingSide && !/lie/i.test(standingSide.en) && /खड़े/.test(standingSide.hi), standingSide.en.slice(0, 60));
  check("Seated neck work: chair, face height, 2-3 feet", /chair/i.test(cameraSetupTip("e30").en) && /2 to 3 feet/.test(cameraSetupTip("e30").en) && /कुर्सी/.test(cameraSetupTip("e30").hi));
  check("Bridging: floor, 4-5 feet, hips/knees/feet (head not needed)", /4 to 5 feet/.test(cameraSetupTip("e3").en) && /head doesn't need/.test(cameraSetupTip("e3").en));
  check("Lying exercises: floor beside the mat, 5-6 feet, side-on", /5 to 6 feet/.test(cameraSetupTip("e4").en) && /beside your mat/.test(cameraSetupTip("e4").en));
  check("Standing front-on: waist height, 6-8 feet", /6 to 8 feet/.test(cameraSetupTip("e14").en) && /waist height/.test(cameraSetupTip("e14").en));
  check("Hold exercises get a tip that fits them too (not just the rep ones)", cameraSetupTip("e6") === M.cameraSetupTipSide && cameraSetupTip("e23") === M.cameraSetupTipSide);
  check("Heel Raises now have real step-by-step instructions (guide would otherwise read generic text)", getInstructions("e16").length === 3 && /[ऀ-ॿ]/.test(getInstructions("e16")[0].hi));
}

// ================================================================ 2
section("The full first-time guide: where to put the phone, what today is, how many, how to do it");
{
  const ex = exById("e30");
  const b = buildBriefing({ ex, targetReps: 10, full: true });
  check("Four parts, in order: placement, today's exercise, how it is done, safety + what happens next", b.length === 4);
  check("1. Placement is the exercise's own set-up tip", b[0] === cameraSetupTip("e30"));
  check("2. Says the exercise name and the rep count in English", /Neck Rotation/.test(b[1].en) && /10 times/.test(b[1].en) && /count together/.test(b[1].en), b[1].en);
  check("2. ...and in Hindi with the Hindi name and number word", /गर्दन को दाएं-बाएं घुमाना/.test(b[1].hi) && /दस बार/.test(b[1].hi) && /गिनती हम साथ में करेंगे/.test(b[1].hi), b[1].hi);
  check("2. ...spoken numbers are words, not digits (TTS can't be trusted with numerals)", /ten times/i.test(b[1].voiceEn) && !/\d/.test(b[1].voiceEn) && !/\d/.test(b[1].voiceHi));
  check("3. How it is done = the first two on-screen instruction steps, both languages", b[2].en.includes(getInstructions("e30")[0].en.replace(/\.$/, "")) && b[2].hi.includes(getInstructions("e30")[1].hi.replace(/[.।]$/, "")), b[2].en.slice(0, 80));
  check("3. ...only two steps (a guide read in full would be skipped)", (b[2].en.match(/\. /g) || []).length === 1);
  check("4. Tells them to go slowly and stop for sharp pain, then explains the 3-2-1", /stop if you feel sharp pain/.test(b[3].en) && /3, 2, 1/.test(b[3].en) && /तेज़ दर्द/.test(b[3].hi) && /तीन, दो, एक/.test(b[3].hi));
  check("4. ...and the SPOKEN version says the numbers as words", /three, two, one/.test(b[3].voiceEn) && !/\d/.test(b[3].voiceEn));
  check("Every line has text and a spoken version in both languages", b.every((l) => l.en && l.voiceEn && dev.test(l.hi) && dev.test(l.voiceHi)));
  const short = buildBriefing({ ex, targetReps: 10, full: false });
  check("Repeat visit: just today's exercise and what happens next", short.length === 2 && /Neck Rotation/.test(short[0].en) && /3, 2, 1/.test(short[1].en));
  const flex = buildBriefing({ ex: exById("e13"), targetReps: 12, full: true });
  check("Works for another exercise (Shoulder Flexion, 12 reps) with its own Hindi name", /बारह बार/.test(flex[1].hi) && /हाथ को आगे उठाना/.test(flex[1].hi) && flex[0] === M.cameraSetupTipStandingSide);
  const unknown = buildBriefing({ ex: { id: "zz", name: "Mystery Move" }, targetReps: 8, full: true });
  check("An exercise with no Hindi name or instructions still gets a sensible guide (falls back, never crashes)", unknown.length === 4 && /Mystery Move/.test(unknown[1].hi) && unknown[2].en.length > 10);
  check("exerciseNames gives both languages", exerciseNames(ex).en === "Neck Rotation" && dev.test(exerciseNames(ex).hi));
  const holdB = buildBriefing({ ex: exById("e23"), isHold: true, holdSeconds: 20, holds: 3, full: true });
  check("Hold exercise: says the hold time and how many times, in both languages", /20 seconds, 3 times/.test(holdB[1].en) && /बीस सेकंड/.test(holdB[1].hi) && /तीन बार/.test(holdB[1].hi), holdB[1].en);
  check("Hold exercise: explains the timer instead of a 3-2-1 countdown", /timer runs only while/.test(holdB[3].en) && !/3, 2, 1/.test(holdB[3].en) && /समय तभी गिना जाएगा/.test(holdB[3].hi));
  check("Every tracked exercise builds a complete guide", [...Object.keys(TRACKED_EXERCISE_COMPONENTS), ...Object.keys(HOLD_TRACKED_EXERCISES)].every((id) => {
    const e = exById(id); if (!e) return false;
    return buildBriefing({ ex: e, targetReps: 10, isHold: !!HOLD_TRACKED_EXERCISES[id], full: true }).every((l) => l.en && dev.test(l.hi) && l.voiceEn && dev.test(l.voiceHi));
  }));
}

// ================================================================ 3
section("During the set: the count, how many are left, encouragement");
{
  const say = (count, target = 10, correction = null) => repCallout({ count, target, correction });
  check("Every rep says its number (English and Hindi words)", say(7).voiceEn.startsWith("Seven") && say(7).voiceHi.startsWith("सात"));
  check("Rep 1 of 10: 'Good start' / 'अच्छी शुरुआत'", say(1).voiceEn === "One. Good start" && say(1).voiceHi === "एक. अच्छी शुरुआत", say(1).voiceEn);
  check("Halfway (rep 5 of 10): 'आधे हो गए'", say(5).voiceEn === "Five. Halfway there" && say(5).voiceHi === "पांच. आधे हो गए");
  check("Three left: 'बस तीन और'", say(7).voiceEn === "Seven. Just three more" && say(7).voiceHi === "सात. बस तीन और");
  check("Two left: 'बस दो और'", say(8).voiceHi === "आठ. बस दो और");
  check("Last one: 'आख़िरी एक'", say(9).voiceEn === "Nine. Last one" && say(9).voiceHi === "नौ. आख़िरी एक");
  check("The final rep ends with 'well done' / 'शाबाश! पूरा हो गया!'", say(10).voiceEn === "Ten. Well done, all done!" && say(10).voiceHi === "दस. शाबाश! पूरा हो गया!");
  check("Plain middle reps are just the number (no chatter on every rep)", say(2).voiceEn === "Two" && say(6).voiceEn === "Six");
  check("Every 4th plain rep gets a word of encouragement ('आप अच्छा कर रहे हैं')", say(4, 14).voiceHi === "चार. आप अच्छा कर रहे हैं" && say(8, 14).voiceHi.includes("बहुत बढ़िया"), say(4, 14).voiceHi);
  const fix = { voiceEn: "Chin level", voiceHi: "ठुड्डी सीधी" };
  check("A correction ALWAYS wins over a cheer: number, then the correction only", say(4, 14, fix).voiceEn === "Four. Chin level" && say(4, 14, fix).voiceHi === "चार. ठुड्डी सीधी");
  check("...even on the last rep, the correction is what is said", say(10, 10, fix).voiceEn === "Ten. Chin level");
  check("Small target (3 reps): sensible, never a nonsense 'three more' on rep 1", say(1, 3).voiceEn === "One. Just two more" && say(2, 3).voiceEn === "Two. Last one" && say(3, 3).voiceEn.endsWith("all done!"));
  check("Target of 1: the only rep is the last", say(1, 1).voiceEn === "One. Well done, all done!");
  check("An unknown/infinite target never produces 'NaN' or crashes", /^Three/.test(say(3, Infinity).voiceEn) && !/NaN|undefined/.test(say(3, Infinity).voiceEn) && !/NaN|undefined/.test(say(3, undefined).voiceEn));
  check("Beyond the number-word table it still says the number", say(35, 40).voiceEn.startsWith("35") && say(35, 40).voiceHi.startsWith("35"));
  check("A 10-rep set tells the patient how many are left at least 4 times", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].filter((c) => /more|Last|Halfway|done/.test(say(c).voiceEn)).length >= 4);

  check("Hold: seconds are counted, with 'five more seconds' near the end", holdTick(15, 20).voiceEn === "Fifteen. Just five more seconds" && holdTick(15, 20).voiceHi === "पंद्रह. बस पांच सेकंड और" && holdTick(10, 20).voiceEn === "Ten");
  check("Hold: no 'five more' for a very short hold", holdTick(5, 10).voiceEn === "Five");
  check("Hold done, more to go: says how many are left", holdDoneCallout({ done: 1, total: 4 }).voiceEn === "One done. Three more to go" && holdDoneCallout({ done: 1, total: 4 }).voiceHi === "एक पूरा हुआ। तीन और बाकी", holdDoneCallout({ done: 1, total: 4 }).voiceHi);
  check("Hold done, one left: the count is right whatever the total (and Hindi agrees: दो पूरे हुए)", holdDoneCallout({ done: 2, total: 3 }).voiceEn === "Two done. One more to go" && holdDoneCallout({ done: 2, total: 3 }).voiceHi === "दो पूरे हुए। बस एक और बाकी", holdDoneCallout({ done: 2, total: 3 }).voiceHi);
  check("Hold all done: 'शाबाश!'", holdDoneCallout({ done: 3, total: 3 }).voiceHi === "शाबाश! पूरा हो गया!");
}

// ================================================================ 4
section("Speech plumbing (fake speech engine): the guide plays in order and cannot be cut off by other prompts");
{
  const log = [];
  class Utt { constructor(text) { this.text = text; } }
  const fake = {
    speaking: false, pending: false, hold: false, _cur: null, _t: null,
    speak(u) { log.push(["speak", u.text, u.lang]); this._cur = u; this.speaking = true; if (!this.hold) this._t = setTimeout(() => this._end(), 8); },
    _end() { const u = this._cur; this._cur = null; this.speaking = false; if (u && u.onend) u.onend({}); },
    cancel() { clearTimeout(this._t); const u = this._cur; this._cur = null; this.speaking = false; log.push(["cancel"]); if (u && u.onerror) u.onerror({ error: "canceled" }); },
    getVoices() { return []; },
  };
  globalThis.window = { speechSynthesis: fake };
  globalThis.SpeechSynthesisUtterance = Utt;

  const lines = [
    { en: "a", hi: "अ", voiceEn: "line one", voiceHi: "पहली" },
    { en: "b", hi: "ब", voiceEn: "line two", voiceHi: "दूसरी" },
    { en: "c", hi: "स", voiceEn: "line three", voiceHi: "तीसरी" },
  ];
  {
    log.length = 0;
    const v = createVoiceCoach();
    const seen = []; let done = null;
    v.speakSequence(lines, { onLine: (i) => seen.push(i), onDone: (c) => { done = c; }, fallbackMs: () => 500 });
    await sleep(120);
    const spoken = log.filter((e) => e[0] === "speak").map((e) => e[1]);
    check("Lines are spoken one after another, in order, each when the last has ended", spoken.join("|") === "line one|line two|line three", spoken.join("|"));
    check("onLine reports each line for the on-screen text", seen.join(",") === "0,1,2");
    check("onDone(true) fires once when the guide completes", done === true);
    check("Not active afterward", v.isSequenceActive() === false);
  }
  {
    log.length = 0;
    const v = createVoiceCoach(); v.setLanguage("hi");
    v.speakSequence(lines, { fallbackMs: () => 500 });
    await sleep(80);
    const sp = log.filter((e) => e[0] === "speak");
    check("Speaks the Hindi lines with the Hindi voice code when Hindi is selected", sp[0][1] === "पहली" && sp[0][2] === "hi-IN", `${sp[0][1]} ${sp[0][2]}`);
  }
  {
    log.length = 0;
    const v = createVoiceCoach(); let done = null;
    v.speakSequence(lines, { onDone: (c) => { done = c; }, fallbackMs: () => 500 });
    v.speak({ voiceEn: "Move back" }, "framing-cut_off");
    v.speak({ voiceEn: "Two" }, "countdown-2");
    await sleep(120);
    const spoken = log.filter((e) => e[0] === "speak").map((e) => e[1]);
    check("Other prompts (move back, countdown) are ignored while the guide plays — they can't cut it off", !spoken.includes("Move back") && !spoken.includes("Two") && spoken.length === 3, spoken.join("|"));
    check("...and the guide still finishes", done === true);
    v.speak({ voiceEn: "Move back" }, "framing-cut_off");
    check("After the guide ends, normal prompts speak again", log.filter((e) => e[0] === "speak").map((e) => e[1]).includes("Move back"));
  }
  {
    log.length = 0;
    const v = createVoiceCoach(); let calls = 0, done = null;
    fake.hold = true;
    v.speakSequence(lines, { onDone: (c) => { calls++; done = c; }, fallbackMs: () => 500 });
    await sleep(20);
    v.cancelSequence();
    await sleep(60);
    fake.hold = false;
    check("Skip (cancel) mid-guide stops it: no further lines are spoken", log.filter((e) => e[0] === "speak").length === 1);
    check("...onDone(false) is called exactly once", calls === 1 && done === false, `calls ${calls}`);
  }
  {
    log.length = 0;
    const v = createVoiceCoach(); let calls = 0;
    fake.hold = true;
    v.speakSequence(lines, { onDone: () => { calls++; }, fallbackMs: () => 500 });
    await sleep(10);
    v.setEnabled(false);
    await sleep(30);
    fake.hold = false;
    check("Switching the voice off mid-guide ends it cleanly", calls === 1 && v.isSequenceActive() === false);
    v.setEnabled(true);
  }
  {
    log.length = 0;
    const v = createVoiceCoach(); let done = null;
    fake.hold = true; // the browser never fires `end`
    v.speakSequence(lines.slice(0, 2), { onDone: (c) => { done = c; }, fallbackMs: () => 30 });
    await sleep(150);
    fake.hold = false;
    check("If the browser never reports the end of a line, the guide moves on anyway (safety timeout)", done === true && log.filter((e) => e[0] === "speak").length === 2);
  }
  {
    const v = createVoiceCoach(); v.setEnabled(false); let done = null;
    v.speakSequence(lines, { onDone: (c) => { done = c; } });
    check("Voice off: nothing is spoken and the guide is over immediately (onDone(false))", done === false && v.isSequenceActive() === false);
  }
  {
    const v = createVoiceCoach(); let done = null;
    v.speakSequence([], { onDone: (c) => { done = c; } });
    check("An empty guide ends immediately", done === false);
  }
  {
    log.length = 0;
    const v = createVoiceCoach(); let finished = false;
    fake.hold = true;
    v.speak({ voiceEn: "Ten. Well done" }, "rep-10");
    v.whenIdle(() => { finished = true; }, 2000);
    await sleep(400);
    check("whenIdle waits while the last line is still being said (so 'well done' isn't cut off)", finished === false);
    fake.hold = false; fake._end();
    await sleep(300);
    check("...and fires once it has finished", finished === true);
  }
  {
    const v = createVoiceCoach(); let finished = false;
    fake.hold = true; fake.speaking = true;
    v.whenIdle(() => { finished = true; }, 300);
    await sleep(700);
    fake.hold = false; fake.speaking = false;
    check("whenIdle gives up after its maximum wait instead of hanging forever", finished === true);
  }
  {
    delete globalThis.window; delete globalThis.SpeechSynthesisUtterance;
    const v = createVoiceCoach(); let finished = false, done = null;
    v.whenIdle(() => { finished = true; });
    v.speakSequence(lines, { onDone: (c) => { done = c; } });
    check("No speech support (some in-app browsers): both fall straight through, nothing throws", finished === true && done === false);
  }
}

// ================================================================ 5
section("Language choice and 'have they had the full guide yet'");
{
  const mem = () => { const d = {}; return { getItem: (k) => (k in d ? d[k] : null), setItem: (k, v) => { d[k] = String(v); }, d }; };
  check("Defaults to English", preferredVoiceLang(mem(), { language: "en-US" }) === "en");
  check("A Hindi device defaults to Hindi", preferredVoiceLang(mem(), { language: "hi-IN" }) === "hi" && preferredVoiceLang(mem(), { languages: ["hi"] }) === "hi");
  const st = mem(); rememberVoiceLang("hi", st);
  check("Remembers what the patient picked, over the device language", preferredVoiceLang(st, { language: "en-US" }) === "hi");
  rememberVoiceLang("en", st);
  check("...including switching back to English on a Hindi device", preferredVoiceLang(st, { language: "hi-IN" }) === "en");
  rememberVoiceLang("fr", st);
  check("Ignores a bad stored value", preferredVoiceLang(st, { language: "hi-IN" }) === "en");
  const thrower = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); } };
  check("Blocked storage (private window) never throws", preferredVoiceLang(thrower, { language: "hi" }) === "hi" && (rememberVoiceLang("hi", thrower), true));
  check("No storage and no navigator at all -> English", preferredVoiceLang(null, null) === "en");

  const gm = createGuideMemory(mem());
  check("A new patient needs the full guide for an exercise", gm.needsFullGuide("e30") === true);
  gm.markGuided("e30");
  check("After hearing it, that exercise gets the short version", gm.needsFullGuide("e30") === false);
  check("...but other exercises still get the full one", gm.needsFullGuide("e31") === true);
  gm.markGuided("e30");
  const shared = mem(); createGuideMemory(shared).markGuided("e29");
  check("Remembered across visits (same storage)", createGuideMemory(shared).needsFullGuide("e29") === false);
  const bad = createGuideMemory(thrower);
  check("Blocked storage: always the full guide, never throws", bad.needsFullGuide("e1") === true && (bad.markGuided("e1"), true));
  const corrupt = mem(); corrupt.setItem("physio.guided.v1", "{not json");
  check("Corrupt stored data is treated as 'never guided'", createGuideMemory(corrupt).needsFullGuide("e29") === true);
}

// ================================================================ 6
section("The 3-2-1 waits for the guide, then runs");
{
  const lm = (() => {
    const L = Array.from({ length: 33 }, () => ({ x: 0.5, y: 1.4, z: 0, visibility: 0.05 }));
    L[0] = { x: 0.5, y: 0.4, z: 0, visibility: 0.95 }; L[7] = { x: 0.45, y: 0.42, z: 0, visibility: 0.95 }; L[8] = { x: 0.55, y: 0.42, z: 0, visibility: 0.95 };
    L[11] = { x: 0.62, y: 0.7, z: 0, visibility: 0.95 }; L[12] = { x: 0.38, y: 0.7, z: 0, visibility: 0.95 };
    return L;
  })();
  const sess = createLiveSession({ trackerFactory: TRACKED_EXERCISE_COMPONENTS.e30, orientation: TRACKER_CAMERA_ORIENTATION.e30, region: TRACKER_FRAMING_REGION.e30 });
  let now = 9_000_000, last = null, countdownEvents = 0;
  const step = (hold) => { last = sess.process(lm, now, { aspect: 16 / 9, holdStart: hold }); now += 33; countdownEvents += last.events.filter((e) => e.type === "countdown" || e.type === "go").length; };
  for (let i = 0; i < 300; i++) step(true); // ~10 s of a perfect set-up while the guide is still talking
  check("While the guide talks: the camera is happy and 'armed', but no countdown starts", last.armed === true && last.framing.status === "ok" && last.countdown === null && countdownEvents === 0 && last.started === false);
  for (let i = 0; i < 40; i++) step(false);
  check("The moment the guide ends, the 3-2-1 begins", last.countdown === 3 && countdownEvents >= 1, `countdown ${last.countdown}`);
  for (let i = 0; i < 150; i++) step(false);
  check("...and runs through to Go", last.started === true);
  const sess2 = createLiveSession({ trackerFactory: TRACKED_EXERCISE_COMPONENTS.e30, orientation: "frontal", region: "upper" });
  let r2 = null, n2 = 9_100_000;
  for (let i = 0; i < 200; i++) { r2 = sess2.process(lm, n2, { aspect: 16 / 9 }); n2 += 33; }
  check("Without the hold flag nothing changes: the countdown still starts by itself (existing behaviour)", r2.started === true || r2.countdown !== null);
}

console.log(`\n${failed === 0 ? `All ${passed} guide checks passed.` : `${failed} FAILED, ${passed} passed.`}`);
if (failed) process.exit(1);
