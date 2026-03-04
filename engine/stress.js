import { clamp } from "./utils.js";

/**
 * Determine stressed syllable index.
 * - If display syllables include uppercase letters, pick first such syllable (high confidence).
 * - Else language-specific defaults.
 */
export function inferStress({ displaySyllables, lang, syllableCount }) {
  const n = syllableCount ?? (displaySyllables?.length ?? 0);
  if (displaySyllables && displaySyllables.length) {
    const idx = displaySyllables.findIndex(s => /[A-Z]/.test(s));
    if (idx >= 0) {
      return { index: idx, confidence: 0.95, reason: "Stress inferred from provided syllable casing." };
    }
  }

  if (!n || n <= 1) return { index: 0, confidence: 0.55, reason: "Single syllable." };

  const L = (lang || "generic").toLowerCase();
  // Defaults based on common stress systems
  if (L === "pl") return { index: clamp(n-2, 0, n-1), confidence: 0.85, reason: "Polish default stress is penultimate." };
  if (L === "fr") return { index: n-1, confidence: 0.80, reason: "French prominence tends toward final syllable in isolation." };
  if (L === "tr") return { index: n-1, confidence: 0.75, reason: "Turkish default stress often final (with exceptions)." };
  if (L === "es" || L === "pt" || L === "it") return { index: clamp(n-2,0,n-1), confidence: 0.65, reason: "Romance default often penultimate without accent marks." };
  if (L === "de") return { index: 0, confidence: 0.60, reason: "German given names often initial stress (heuristic)." };
  if (L === "en") return { index: 0, confidence: 0.55, reason: "English stress varies; defaulting to initial (heuristic)." };

  return { index: clamp(n-2,0,n-1), confidence: 0.55, reason: "Generic fallback to penultimate." };
}

export function applyStressToDisplay(syllables, stressIndex) {
  return (syllables ?? []).map((s, i) => i === stressIndex ? s.toUpperCase() : s);
}
