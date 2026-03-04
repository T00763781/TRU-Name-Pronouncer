import { normalizeName, stripDiacritics } from "./utils.js";

// Very pragmatic syllable segmentation for names (display-oriented):
// - split into letter groups around vowel clusters
// - keep consonants with nearest vowel
// - handles hyphens/apostrophes by treating them as separators
const VOWELS = "aeiouy";

function isVowel(ch) {
  return VOWELS.includes(ch);
}

function splitParts(name) {
  // Keep only letters + separators for segmentation.
  const cleaned = name.replace(/[^\p{L}\s\-’']/gu, "");
  return cleaned.split(/\s+/).filter(Boolean);
}

function syllablesForToken(token) {
  const raw = token;
  const s = stripDiacritics(raw.toLowerCase());

  // Hard-coded safe heuristics for a few very common roster patterns
  // (still treated as starting points; no identity claims).
  const compact = s.replace(/[^a-z]/g, "");
  if (compact === "nguyen") return ["nguy", "en"]; // rendered later to NWIN-ish options
  if (compact.startsWith("mc") && compact.length > 2) return ["mc", compact.slice(2)];

  // General algorithm:
  // Build chunks: (optional consonants) + vowel cluster + (optional consonants)
  let i = 0;
  const out = [];
  while (i < compact.length) {
    // collect leading consonants
    let onset = "";
    while (i < compact.length && !isVowel(compact[i])) {
      onset += compact[i];
      i++;
    }
    // collect vowel cluster
    let nucleus = "";
    while (i < compact.length && isVowel(compact[i])) {
      nucleus += compact[i];
      i++;
    }
    // if no nucleus (no vowel left), attach rest to last syllable
    if (!nucleus) {
      if (out.length) out[out.length - 1] += onset;
      else out.push(onset);
      continue;
    }
    // collect a small coda (1 consonant) unless next is vowel cluster
    let coda = "";
    if (i < compact.length && !isVowel(compact[i])) {
      coda = compact[i];
      i++;
    }
    out.push(onset + nucleus + coda);
  }

  // post-process: tiny syllables merge
  const merged = [];
  for (const syl of out) {
    if (merged.length && syl.length <= 2) merged[merged.length - 1] += syl;
    else merged.push(syl);
  }
  return merged.filter(Boolean);
}

export function syllabifyDisplay(name) {
  const n = normalizeName(name);
  const parts = splitParts(n);
  const tokens = [];
  for (const part of parts) {
    const chunks = part.split(/[-'’]/).filter(Boolean);
    for (const c of chunks) tokens.push(...syllablesForToken(c));
  }
  return tokens;
}
