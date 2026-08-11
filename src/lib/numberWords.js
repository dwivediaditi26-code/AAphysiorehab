// Spoken word forms for rep counts, 1-30 (covers every prescribed rep range
// in the exercise library, including "each side" targets which double the
// count — e.g. Hip Abduction at "12 each side" targets 24). Word forms are
// used rather than raw numerals because TTS engines don't reliably localize
// numeral pronunciation, especially for Hindi — "8" read with lang="hi-IN"
// isn't guaranteed to come out as "आठ". Anything beyond 30 falls back to
// the plain numeral string.
export const NUMBER_WORDS = {
  en: [
    null, "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen", "Twenty",
    "Twenty-one", "Twenty-two", "Twenty-three", "Twenty-four", "Twenty-five",
    "Twenty-six", "Twenty-seven", "Twenty-eight", "Twenty-nine", "Thirty",
  ],
  hi: [
    null, "एक", "दो", "तीन", "चार", "पांच", "छह", "सात", "आठ", "नौ", "दस",
    "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
    "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस",
    "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस",
  ],
};

export function numberWord(n, lang) {
  return NUMBER_WORDS[lang][n] || String(n);
}
