/**
 * phoneticDisplay.js
 * Convert IPA-ish phoneme syllables into simple, "common sense" English-friendly syllable labels
 * and generate alternative label candidates for dropdown selection.
 *
 * This is intentionally heuristic (POC), but designed to be extensible.
 */

import { ipaJoin } from "./phonemes.js";

const CONSONANT_MAP = new Map([
  // Common consonants
  ["p","P"], ["b","B"], ["t","T"], ["d","D"], ["k","K"], ["g","G"],
  ["f","F"], ["v","V"], ["s","S"], ["z","Z"], ["m","M"], ["n","N"], ["l","L"], ["r","R"],
  ["h","H"], ["j","Y"], ["w","W"],

  // IPA consonants/digraphs
  ["ʃ","SH"], ["ʒ","ZH"], ["tʃ","CH"], ["dʒ","J"], ["θ","TH"], ["ð","TH"],
  ["ŋ","NG"], ["ɲ","NY"], ["ç","HY"], ["x","KH"], ["ɣ","GH"],
  ["ɾ","R"], ["ʔ","’"],

  // Some Slavic-ish
  ["t͡s","TS"], ["t͡ʂ","CH"], ["d͡ʐ","J"], ["ʂ","SH"], ["ʐ","ZH"],

  // Spaces/boundaries should not appear, but guard
  [" ",""],
]);

// Vowel keys → representative IPA nucleus
const VOWELS = {
  AY: "eɪ",
  EH: "ɛ",
  EYE: "aɪ",
  EE: "iː",
  I: "ɪ",
  AH: "ʌ",
  UH: "ə",
  OH: "oʊ",
  OO: "uː",
  U: "ʊ",
  AW: "aʊ",
  OY: "ɔɪ",
  AR: "ɑr",
  OR: "ɔr",
  ER: "ɝ",
  AIR: "ɛr",
};

// When we render vowels as text inside a syllable label, we often want a shorter form for closed syllables.
function vowelKeyToLetters(key, hasCoda) {
  switch (key) {
    case "EH": return hasCoda ? "E" : "EH";
    case "AH": return hasCoda ? "A" : "AH";
    case "UH": return hasCoda ? "U" : "UH";
    case "I":  return "I";
    case "EE": return "EE";
    case "AY": return "AY";
    case "EYE": return "I"; // DYE-like; will be shaped by onset/coda (e.g., DIE)
    case "OH": return "OH";
    case "OO": return "OO";
    case "U": return "U";
    case "AW": return "OW";
    case "OY": return "OY";
    case "AR": return "AR";
    case "OR": return "OR";
    case "ER": return "ER";
    case "AIR": return "AIR";
    default: return key;
  }
}

// Guess a vowel key from an IPA nucleus string.
export function inferVowelKey(nucleusIpa) {
  const s = (nucleusIpa || "").replace(/[ˈˌ]/g, "");
  // Order matters (longest/most specific first)
  if (/ɑr/.test(s)) return "AR";
  if (/ɛr/.test(s)) return "AIR";
  if (/ɔr/.test(s)) return "OR";
  if (/ɝ|ɜr|ər/.test(s)) return "ER";
  if (/ɔɪ/.test(s)) return "OY";
  if (/aʊ/.test(s)) return "AW";
  if (/oʊ|əʊ/.test(s)) return "OH";
  if (/uː|uu|ʉː/.test(s)) return "OO";
  if (/ʊ/.test(s)) return "U";
  if (/eɪ/.test(s)) return "AY";
  if (/aɪ/.test(s)) return "EYE";
  if (/iː|i/.test(s)) return "EE";
  if (/ɪ/.test(s)) return "I";
  if (/ɛ/.test(s)) return "EH";
  if (/æ/.test(s)) return "AH";
  if (/ʌ/.test(s)) return "AH";
  if (/ə/.test(s)) return "UH";
  // fallback
  return "UH";
}

function consonantToLetters(ph) {
  if (!ph) return "";
  // Normalize common multi-char affricates first
  const p = ph
    .replace(/t͡ʃ/g, "tʃ")
    .replace(/d͡ʒ/g, "dʒ")
    .replace(/t͡s/g, "t͡s")
    .replace(/t͡ʂ/g, "t͡ʂ")
    .replace(/d͡ʐ/g, "d͡ʐ");

  if (CONSONANT_MAP.has(p)) return CONSONANT_MAP.get(p);
  // If it's already ASCII letter-ish, keep it.
  if (/^[a-z]$/i.test(p)) return p.toUpperCase();
  return "";
}

/**
 * Convert a syllable object (from syllabifyPhonemes) into a simple label string (uppercase).
 * syllable: { onset:[], nucleus:[], coda:[], phonemes:[] }
 */
export function syllableToLabel(syllable) {
  if (!syllable) return "";
  const onset = (syllable.onset || []).map(consonantToLetters).join("");
  const codaArr = (syllable.coda || []).map(consonantToLetters);
  const coda = codaArr.join("");
  const nucleusIpa = ipaJoin(syllable.nucleus || []);
  const vowelKey = inferVowelKey(nucleusIpa);
  const vowel = vowelKeyToLetters(vowelKey, coda.length > 0);
  // Special smoothing: if vowel is "I" and no onset and no coda, show "EYE" as I is ambiguous
  const label = `${onset}${vowel}${coda}`.replace(/''/g, "’");
  return label || (ipaJoin(syllable.phonemes || []) || "").toUpperCase();
}

// Vowel confusion sets (kept small on purpose to avoid nonsense)
const VOWEL_ALTS = {
  AY: ["EH", "EYE", "EE"],
  EH: ["AY", "I", "EE"],
  EYE: ["AY", "EH", "EE"],
  EE: ["I", "AY", "EH"],
  I: ["EE", "EH", "AY"],
  OH: ["OO", "AH", "AW"],
  OO: ["OH", "U"],
  U: ["OO", "UH"],
  AH: ["UH", "OH"],
  UH: ["AH", "I"],
  AW: ["OH", "AH"],
  OY: ["OH", "EYE"],
  AR: ["OR", "AIR"],
  AIR: ["AR", "ER"],
  OR: ["AR", "ER"],
  ER: ["AIR", "OR"],
};

// Replace nucleus with a vowel prototype while keeping onset/coda.
function withVowel(syllable, vowelKey) {
  const onset = (syllable.onset || []).slice();
  const coda = (syllable.coda || []).slice();
  const nucleus = [VOWELS[vowelKey] || VOWELS.UH];
  return {
    onset,
    nucleus,
    coda,
    phonemes: onset.concat(nucleus, coda),
  };
}

/**
 * Generate label options for a syllable, returning uppercase labels.
 */
export function generateLabelOptions(syllable, lang = "en") {
  if (!syllable) return [];
  const nucleusIpa = ipaJoin(syllable.nucleus || []);
  const baseKey = inferVowelKey(nucleusIpa);
  const baseLabel = syllableToLabel(syllable);

  // For languages with highly regular vowels, keep alts tighter
  const tight = new Set(["es", "pl"]);
  const maxAlts = tight.has(lang) ? 3 : 5;

  const keys = [baseKey].concat(VOWEL_ALTS[baseKey] || []);
  const labels = [];

  for (const k of keys) {
    const lab = syllableToLabel(withVowel(syllable, k));
    if (lab && !labels.includes(lab)) labels.push(lab);
    if (labels.length >= maxAlts) break;
  }

  // Always ensure base is first
  if (labels[0] !== baseLabel) {
    labels.sort((a,b) => (a === baseLabel ? -1 : b === baseLabel ? 1 : 0));
  }
  return labels;
}

// ---- Dictionary / label-only fallback ----

// Order longest-first so we match AIR before A, etc.
const VOWEL_TOKENS = [
  { token: "AIR", key: "AIR" },
  { token: "EYE", key: "EYE" },
  { token: "AY", key: "AY" },
  { token: "EE", key: "EE" },
  { token: "OO", key: "OO" },
  { token: "OH", key: "OH" },
  { token: "OW", key: "AW" },
  { token: "OY", key: "OY" },
  { token: "ER", key: "ER" },
  { token: "AR", key: "AR" },
  { token: "OR", key: "OR" },
  { token: "EH", key: "EH" },
  { token: "AH", key: "AH" },
  { token: "UH", key: "UH" },
  { token: "I", key: "I" },
  { token: "A", key: "AH" },
  { token: "E", key: "EH" },
  { token: "O", key: "OH" },
  { token: "U", key: "UH" },
];

export function generateLabelOptionsFromLabel(label) {
  const L = (label || "").toUpperCase();
  if (!L) return [];
  let match = null;
  for (const t of VOWEL_TOKENS) {
    const idx = L.indexOf(t.token);
    if (idx !== -1) { match = { ...t, idx }; break; }
  }
  if (!match) return [L];

  const onset = L.slice(0, match.idx);
  const coda = L.slice(match.idx + match.token.length);
  const baseKey = match.key;

  const keys = [baseKey].concat(VOWEL_ALTS[baseKey] || []);
  const labels = [];
  for (const k of keys) {
    const vowel = vowelKeyToLetters(k, coda.length > 0);
    const lab = `${onset}${vowel}${coda}`;
    if (lab && !labels.includes(lab)) labels.push(lab);
    if (labels.length >= 5) break;
  }

  // Ensure base first
  const baseLab = L;
  if (labels[0] !== baseLab) {
    labels.sort((a,b) => (a === baseLab ? -1 : b === baseLab ? 1 : 0));
  }
  return labels;
}
