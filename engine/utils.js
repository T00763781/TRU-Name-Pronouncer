// TRU-Pronounce Engine v3 — Utilities (browser-safe, no deps)

export function normalizeName(raw) {
  const s = (raw ?? "").toString();
  // Normalize unicode + collapse spaces
  return s.normalize("NFC")
    .replace(/[\u2018\u2019\u2032]/g, "'")   // smart apostrophes → '
    .replace(/[\u201C\u201D]/g, '"')        // smart quotes → "
    .replace(/[\u2010-\u2015\u2212]/g, "-") // dashes → hyphen
    .replace(/\s+/g, " ")
    .trim();
}

export function stripDiacritics(s) {
  return (s ?? "").normalize("NFD").replace(/\p{Diacritic}+/gu, "").normalize("NFC");
}

export function escapeHTML(s) {
  return (s ?? "").toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

export function detectScript(s) {
  const t = (s ?? "");
  // Return dominant script label; used for high-confidence routing.
  // If multiple scripts appear, return "mixed".
  const scripts = new Set();
  for (const ch of t) {
    if (/\p{Script=Latin}/u.test(ch)) scripts.add("Latin");
    else if (/\p{Script=Cyrillic}/u.test(ch)) scripts.add("Cyrillic");
    else if (/\p{Script=Arabic}/u.test(ch)) scripts.add("Arabic");
    else if (/\p{Script=Hebrew}/u.test(ch)) scripts.add("Hebrew");
    else if (/\p{Script=Devanagari}/u.test(ch)) scripts.add("Devanagari");
    else if (/\p{Script=Han}/u.test(ch)) scripts.add("Han");
    else if (/\p{Script=Hiragana}/u.test(ch) || /\p{Script=Katakana}/u.test(ch)) scripts.add("Kana");
    else if (/\p{Script=Hangul}/u.test(ch)) scripts.add("Hangul");
    else if (/\p{Script=Thai}/u.test(ch)) scripts.add("Thai");
  }
  if (scripts.size === 0) return "Unknown";
  if (scripts.size === 1) return [...scripts][0];
  return "Mixed";
}

export function isLetterLike(ch) {
  return /\p{L}|\p{M}/u.test(ch);
}

export function slugify(s) {
  return stripDiacritics(normalizeName(s)).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
