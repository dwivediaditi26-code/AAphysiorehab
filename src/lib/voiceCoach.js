/**
 * Voice coach for live exercise tracking, built on the browser's native
 * SpeechSynthesis API (no external service, no API key, works offline once
 * the page has loaded). Speaks the short `voiceEn`/`voiceHi` phrases from
 * feedbackMessages.js, not the long on-screen sentences — and speaks ONE
 * selected language at a time, not both back to back.
 *
 * Rate-limited on purpose: real trainers don't repeat the same correction
 * every half-second, and neither should this. A cue only speaks again if
 * either the correction changed, or the same one has persisted past the
 * cooldown. Rep-count announcements bypass this (each rep gets a unique
 * key), since a new rep is a genuinely new, discrete event.
 *
 * Voice availability varies by device/OS — not every device has a Hindi
 * voice installed. Falls back to whatever's available and stays silent
 * rather than throwing if speech synthesis isn't supported at all (e.g.
 * some in-app browsers).
 *
 * Language support: to add a language beyond English/Hindi, add its
 * `voiceXx` field to every entry in feedbackMessages.js and numberWords.js,
 * then add it to LANG_VOICE_FIELD / LANG_SPEECH_CODE below.
 */

const COOLDOWN_MS = 3500;
const LANG_STORAGE_KEY = "physio.voiceLang";

const LANG_VOICE_FIELD = { en: "voiceEn", hi: "voiceHi" };
const LANG_SPEECH_CODE = { en: "en-IN", hi: "hi-IN" };

/**
 * iOS Safari (and iOS Chrome/etc, same WebKit engine) blocks
 * speechSynthesis.speak() calls that aren't triggered directly inside a tap
 * — which every voice cue here is not, since they fire from inside the
 * camera's animation-frame loop, several async steps removed from any tap.
 * The standard workaround: fire one real speak() call synchronously inside
 * an actual tap handler once, which unlocks audio for the rest of the page's
 * lifetime. Call this from the Start Exercise button's onClick, before
 * transitioning into the tracking screen.
 */
export function unlockSpeechSynthesis() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(" ");
  utter.volume = 0;
  window.speechSynthesis.speak(utter);
}

/**
 * Which language the voice should start in: what the patient picked last time
 * (a Hindi speaker shouldn't have to re-tap "हिं" on every exercise), else
 * Hindi if their device is set to Hindi, else English. `storage` and
 * `nav` are injectable for tests; every storage access is guarded because
 * private windows and some in-app browsers throw on it.
 */
export function preferredVoiceLang(storage, nav) {
  try {
    const st = storage === undefined ? (typeof window !== "undefined" ? window.localStorage : null) : storage;
    const saved = st && st.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "hi") return saved;
  } catch { /* fall through to the device language */ }
  const n = nav === undefined ? (typeof navigator !== "undefined" ? navigator : null) : nav;
  const lang = n && (n.language || (n.languages && n.languages[0]));
  return typeof lang === "string" && lang.toLowerCase().startsWith("hi") ? "hi" : "en";
}

export function rememberVoiceLang(lang, storage) {
  try {
    const st = storage === undefined ? (typeof window !== "undefined" ? window.localStorage : null) : storage;
    if (st && (lang === "en" || lang === "hi")) st.setItem(LANG_STORAGE_KEY, lang);
  } catch { /* not worth failing a session over */ }
}

export function createVoiceCoach() {
  let enabled = true;
  let language = "en"; // 'en' | 'hi'
  let lastKey = null;
  let lastSpokenAt = 0;
  let voices = [];
  // A running spoken sequence (the first-time guide). While one plays, ordinary
  // speak() calls are ignored: each one cancels the utterance in progress, which
  // would cut the guide off mid-sentence and then wrongly advance it.
  let sequence = null;

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  function refreshVoices() {
    if (!supported) return;
    voices = window.speechSynthesis.getVoices();
  }
  if (supported) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = refreshVoices;
  }

  function pickVoice(lang) {
    // Prefer an exact/close match (e.g. "hi-IN"), fall back to the
    // language prefix (e.g. any "hi-*"), then let the browser default.
    return (
      voices.find((v) => v.lang === lang) ||
      voices.find((v) => v.lang && v.lang.startsWith(lang.split("-")[0])) ||
      null
    );
  }

  function speakOne(text, lang, handlers = {}) {
    if (!supported || !text) return false;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1.05;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    if (handlers.onEnd) { utter.onend = handlers.onEnd; utter.onerror = handlers.onEnd; }
    window.speechSynthesis.speak(utter);
    return true;
  }

  // Rough speaking time, only used as a safety net: some browsers never fire
  // `end` on a long utterance, and a guide that waits forever is worse than one
  // that moves on a little early.
  const estimateMs = (text) => 2000 + String(text).length * 90;

  function cancelSequence() {
    if (!sequence) return;
    const seq = sequence;
    sequence = null;
    seq.stopped = true;
    if (seq.timer) clearTimeout(seq.timer);
    if (supported) window.speechSynthesis.cancel();
    if (seq.onDone) seq.onDone(false);
  }

  return {
    isSupported() { return supported; },
    setEnabled(value) {
      enabled = value;
      if (!value) { cancelSequence(); if (supported) window.speechSynthesis.cancel(); }
    },
    isEnabled() { return enabled; },
    setLanguage(lang) { language = LANG_VOICE_FIELD[lang] ? lang : "en"; },
    getLanguage() { return language; },

    /** message: an entry from FEEDBACK_MESSAGES, or an ad-hoc object shaped the
     * same way (needs voiceEn/voiceHi). key: a stable identifier for that
     * message, so repeats can be rate-limited — use a unique key (e.g.
     * `rep-${count}`) for events that should always speak regardless of
     * cooldown, like a new rep. */
    speak(message, key) {
      if (!enabled || !supported || !message || sequence) return;
      const now = Date.now();
      const isRepeat = key === lastKey;
      if (isRepeat && now - lastSpokenAt < COOLDOWN_MS) return;

      const field = LANG_VOICE_FIELD[language] || "voiceEn";
      const code = LANG_SPEECH_CODE[language] || "en-IN";
      const text = message[field];

      window.speechSynthesis.cancel(); // don't let cues queue up and lag behind
      speakOne(text, code);

      lastKey = key;
      lastSpokenAt = now;
    },

    /**
     * Speak a list of messages one after another, in the selected language, and
     * report progress so the screen can show the matching text.
     *   onLine(index, message)  just before each line is spoken
     *   onDone(completed)       once, when the last line ends (true) or the
     *                           sequence is cancelled / voice is switched off (false)
     *   fallbackMs(text)        override the "never got an end event" timeout (tests)
     * Returns { cancel() }. With voice off or unsupported nothing is spoken and
     * onDone(false) is called straight away.
     */
    speakSequence(messages, { onLine, onDone, fallbackMs } = {}) {
      cancelSequence();
      if (!enabled || !supported || !messages || messages.length === 0) {
        if (onDone) onDone(false);
        return { cancel() {} };
      }
      window.speechSynthesis.cancel(); // clear anything still talking
      const seq = { stopped: false, timer: null, onDone };
      sequence = seq;
      let i = 0;
      const next = () => {
        if (seq.stopped) return;
        if (seq.timer) { clearTimeout(seq.timer); seq.timer = null; }
        if (i >= messages.length) {
          sequence = null;
          if (onDone) onDone(true);
          return;
        }
        const msg = messages[i];
        const index = i++;
        if (onLine) onLine(index, msg);
        const text = msg[LANG_VOICE_FIELD[language] || "voiceEn"];
        let advanced = false;
        const advance = () => { if (!advanced) { advanced = true; next(); } };
        if (!speakOne(text, LANG_SPEECH_CODE[language] || "en-IN", { onEnd: advance })) { advance(); return; }
        seq.timer = setTimeout(advance, (fallbackMs || estimateMs)(text));
      };
      next();
      return { cancel: cancelSequence };
    },

    isSequenceActive() { return !!sequence; },
    cancelSequence,

    /** Call `cb` once whatever is being said has finished (or after maxMs).
     * Lets the screen close without cutting off the last line — "well done" is
     * pointless if the next screen cancels it mid-word. */
    whenIdle(cb, maxMs = 5000) {
      if (!enabled || !supported) { cb(); return; }
      const t0 = Date.now();
      const tick = () => {
        const busy = window.speechSynthesis.speaking || window.speechSynthesis.pending;
        if (!busy || Date.now() - t0 >= maxMs) cb();
        else setTimeout(tick, 100);
      };
      setTimeout(tick, 150); // `speaking` only turns true a moment after speak()
    },

    reset() {
      lastKey = null;
      lastSpokenAt = 0;
      cancelSequence();
      if (supported) window.speechSynthesis.cancel();
    },
  };
}
