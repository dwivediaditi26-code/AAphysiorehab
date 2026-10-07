/**
 * What the app SAYS to a patient who has never used it: where to put the
 * phone and how far away, what today's exercise is, how many to do, how it is
 * done, and then — during the set — the count, how many are left, and a word of
 * encouragement. Pure functions that return bilingual message objects shaped
 * like feedbackMessages.js entries ({ en, hi, voiceEn, voiceHi }), so the same
 * voice coach and the same on-screen text path handle them. No speech, DOM or
 * React in here, so every line can be tested in node.
 *
 * Why it is a script and not a one-off video: a patient on their own at home
 * has no one to ask "how far do I put the phone?" — so the app asks and
 * answers it out loud, in Hindi or English, before the camera starts counting.
 * The first time for each exercise the guide is the full version; afterwards
 * a short one (see createGuideMemory), because the same long speech on every
 * visit would be skipped by everyone.
 *
 * Distances are general guidance (the framing check still corrects the real
 * shot), not measurements — tune them when you see real phones in real rooms.
 */
import { numberWord } from "./numberWords.js";
import { getInstructions } from "../data/seed.js";
import { cameraSetupTip } from "./trackedExercises.js";

// Hindi names as a patient would say them (loanwords where that is what people
// actually say). English names come from the exercise record itself.
const HI_NAMES = {
  e3: "ग्लूट ब्रिज", e4: "डेड बग", e5: "बर्ड डॉग", e6: "साइड प्लैंक",
  e9: "स्क्वाट", e13: "हाथ को आगे उठाना", e14: "हाथ को बगल में उठाना",
  e15: "कुर्सी से उठना-बैठना", e16: "एड़ियां ऊपर उठाना", e17: "एक पैर का ब्रिज",
  e18: "खड़े होकर पैर को बगल में उठाना", e19: "करवट लेकर पैर उठाना",
  e20: "जांघों को अंदर की तरफ़ दबाना", e22: "सुपरमैन", e23: "फ्रंट प्लैंक",
  e27: "पेट के बल प्रेस-अप", e29: "ठुड्डी अंदर करना, यानी चिन टक",
  e30: "गर्दन को दाएं-बाएं घुमाना", e31: "गर्दन को कंधे की तरफ़ झुकाना",
};

const SAFETY = {
  en: "Move slowly, and stop if you feel sharp pain.",
  hi: "धीरे-धीरे करें, और तेज़ दर्द हो तो रुक जाएं।",
};

const msg = (en, hi, voiceEn = en, voiceHi = hi) => ({ en, hi, voiceEn, voiceHi });
const sentence = (t) => String(t).trim().replace(/[.।]+$/, "");

/** The patient-facing name of an exercise in each language. */
export function exerciseNames(ex) {
  return { en: ex.name, hi: HI_NAMES[ex.id] || ex.name };
}

/**
 * The spoken guide before the camera starts counting, as an ordered list of
 * messages. `full` (first time) = camera placement and distance, what today's
 * exercise is and how many, how it is done, then the safety line and what
 * happens next. Short (repeat visits) = just what is today's exercise and what
 * happens next.
 *
 * opts: { ex, targetReps, isHold, holdSeconds, holds, full }
 */
export function buildBriefing({ ex, targetReps, isHold = false, holdSeconds = 20, holds = 1, full = true }) {
  const name = exerciseNames(ex);
  let intro;
  if (isHold) {
    intro = msg(
      `Today's exercise is ${name.en}. Hold the position for ${holdSeconds} seconds, ${holds} ${holds === 1 ? "time" : "times"}.`,
      `आज की कसरत है ${name.hi}। इस स्थिति में ${numberWord(holdSeconds, "hi")} सेकंड रुकना है, ${numberWord(holds, "hi")} बार।`,
      `Today's exercise is ${name.en}. Hold the position for ${numberWord(holdSeconds, "en")} seconds, ${numberWord(holds, "en")} ${holds === 1 ? "time" : "times"}.`,
    );
  } else {
    intro = msg(
      `Hello! Today's exercise is ${name.en}. You'll do it ${targetReps} times, and we'll count together.`,
      `नमस्ते! आज की कसरत है ${name.hi}। इसे ${numberWord(targetReps, "hi")} बार करना है, और गिनती हम साथ में करेंगे।`,
      `Hello! Today's exercise is ${name.en}. You'll do it ${numberWord(targetReps, "en")} times, and we'll count together.`,
    );
  }

  const ready = isHold
    ? msg(
        "The timer runs only while you are in the right position. When you are, we'll begin.",
        "समय तभी गिना जाएगा जब आप सही स्थिति में होंगे। स्थिति में आते ही हम शुरू करेंगे।",
      )
    : msg(
        "When the camera can see you properly, we'll count 3, 2, 1 and begin.",
        "जब कैमरा आपको ठीक से देख लेगा, तब तीन, दो, एक की गिनती के बाद हम शुरू करेंगे।",
        "When the camera can see you properly, we'll count three, two, one and begin.",
      );

  if (!full) return [intro, ready];

  const steps = getInstructions(ex.id).slice(0, 2);
  const how = msg(
    steps.map((s) => sentence(s.en)).join(". ") + ".",
    steps.map((s) => sentence(s.hi)).join("। ") + "।",
  );
  const safetyAndReady = msg(
    `${SAFETY.en} ${ready.en}`,
    `${SAFETY.hi} ${ready.hi}`,
    `${SAFETY.en} ${ready.voiceEn}`,
    `${SAFETY.hi} ${ready.voiceHi}`,
  );
  return [cameraSetupTip(ex.id), intro, how, safetyAndReady];
}

// --- during the set -------------------------------------------------------

const CHEERS = [
  msg("You're doing well", "आप अच्छा कर रहे हैं"),
  msg("Great, keep going", "बहुत बढ़िया, ऐसे ही करते रहें"),
];

/**
 * What to say when a rep is counted: the number, then ONE of — the correction
 * for that rep, or how many are left / encouragement. A correction always wins:
 * stacking a cheer on top of "keep your chin level" teaches nobody anything.
 * `correction` is a feedbackMessages entry or null.
 */
export function repCallout({ count, target, correction = null }) {
  const num = { en: numberWord(count, "en"), hi: numberWord(count, "hi") };
  const join = (extra) => ({
    voiceEn: extra ? `${num.en}. ${extra.voiceEn}` : num.en,
    voiceHi: extra ? `${num.hi}. ${extra.voiceHi}` : num.hi,
  });
  if (correction) return join(correction);

  const left = Number.isFinite(target) ? target - count : Infinity;
  if (left <= 0) return join(msg("Well done, all done!", "शाबाश! पूरा हो गया!"));
  if (left === 1) return join(msg("Last one", "आख़िरी एक"));
  if (left === 2) return join(msg("Just two more", "बस दो और"));
  if (left === 3) return join(msg("Just three more", "बस तीन और"));
  if (Number.isFinite(target) && target >= 6 && count === Math.ceil(target / 2)) return join(msg("Halfway there", "आधे हो गए"));
  if (count === 1) return join(msg("Good start", "अच्छी शुरुआत"));
  if (count % 4 === 0) return join(CHEERS[(count / 4 - 1) % CHEERS.length]);
  return join(null);
}

/** Hold exercises: the seconds are called out every 5 s; near the end say how long is left. */
export function holdTick(sec, targetSec) {
  const num = { en: numberWord(sec, "en"), hi: numberWord(sec, "hi") };
  const left = targetSec - sec;
  if (targetSec >= 15 && left === 5) return { voiceEn: `${num.en}. Just five more seconds`, voiceHi: `${num.hi}. बस पांच सेकंड और` };
  return { voiceEn: num.en, voiceHi: num.hi };
}

/** Hold exercises: said when one hold is completed. */
export function holdDoneCallout({ done, total }) {
  const left = total - done;
  if (left <= 0) return msg("Well done, all done!", "शाबाश! पूरा हो गया!");
  // Hindi agrees with the count: "एक पूरा हुआ" but "दो पूरे हुए".
  const doneHi = done === 1 ? "एक पूरा हुआ" : `${numberWord(done, "hi")} पूरे हुए`;
  if (left === 1) return msg(`${numberWord(done, "en")} done. One more to go`, `${doneHi}। बस एक और बाकी`);
  return msg(`${numberWord(done, "en")} done. ${numberWord(left, "en")} more to go`, `${doneHi}। ${numberWord(left, "hi")} और बाकी`);
}

// --- remembering who has had the full guide -------------------------------

const MEMORY_KEY = "physio.guided.v1";

/** Tracks which exercises this patient has already had the full guide for.
 * `storage` is injectable; every access is guarded (private windows throw). */
export function createGuideMemory(storage) {
  const st = storage === undefined ? (typeof window !== "undefined" ? window.localStorage : null) : storage;
  const read = () => {
    try { const v = JSON.parse((st && st.getItem(MEMORY_KEY)) || "[]"); return Array.isArray(v) ? v : []; }
    catch { return []; }
  };
  return {
    needsFullGuide(exId) { return !read().includes(exId); },
    markGuided(exId) {
      try {
        const seen = read();
        if (!seen.includes(exId) && st) st.setItem(MEMORY_KEY, JSON.stringify([...seen, exId]));
      } catch { /* a guide that can't remember just plays in full again */ }
    },
  };
}
