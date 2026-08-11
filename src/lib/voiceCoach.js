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

export function createVoiceCoach() {
  let enabled = true;
  let language = "en"; // 'en' | 'hi'
  let lastKey = null;
  let lastSpokenAt = 0;
  let voices = [];

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

  function speakOne(text, lang) {
    if (!supported || !text) return;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 1.05;
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  return {
    isSupported() { return supported; },
    setEnabled(value) { enabled = value; if (!value && supported) window.speechSynthesis.cancel(); },
    isEnabled() { return enabled; },
    setLanguage(lang) { language = LANG_VOICE_FIELD[lang] ? lang : "en"; },
    getLanguage() { return language; },

    /** message: an entry from FEEDBACK_MESSAGES, or an ad-hoc object shaped the
     * same way (needs voiceEn/voiceHi). key: a stable identifier for that
     * message, so repeats can be rate-limited — use a unique key (e.g.
     * `rep-${count}`) for events that should always speak regardless of
     * cooldown, like a new rep. */
    speak(message, key) {
      if (!enabled || !supported || !message) return;
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

    reset() {
      lastKey = null;
      lastSpokenAt = 0;
      if (supported) window.speechSynthesis.cancel();
    },
  };
}
