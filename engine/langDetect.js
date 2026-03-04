import { detectScript, stripDiacritics } from "./utils.js";

const DIACRITIC_HINTS = [
  { re: /[ñáéíóúü]/i, lang: "es", w: 2.0, why: "Spanish diacritics/ñ detected" },
  { re: /[çàâæéèêëîïôœùûüÿ]/i, lang: "fr", w: 2.0, why: "French diacritics detected" },
  { re: /[äöüß]/i, lang: "de", w: 2.0, why: "German umlauts/ß detected" },
  { re: /[łńśźżąćęó]/i, lang: "pl", w: 2.5, why: "Polish diacritics detected" },
  { re: /[ăâđêôơư]/i, lang: "vi", w: 3.0, why: "Vietnamese letters detected" },
  { re: /[şğıİçöü]/i, lang: "tr", w: 2.5, why: "Turkish letters detected" },
  { re: /[ãõç]/i, lang: "pt", w: 2.0, why: "Portuguese diacritics detected" },
  { re: /[čďěňřšťůž]/i, lang: "cs", w: 2.0, why: "Czech diacritics detected" },
  { re: /[šđžćč]/i, lang: "hr", w: 1.8, why: "South Slavic diacritics detected" }
];

const ORTHO_HINTS = [
  { re: /\bnguyen\b/i, lang: "vi", w: 4.0, why: "Common Vietnamese surname pattern" },
  { re: /\b(tran|pham|vu|le|ngo|dang|bui)\b/i, lang: "vi", w: 2.5, why: "Common Vietnamese surname pattern" },
  { re: /(sz|cz|rz|wicz|ski|szcz)/i, lang: "pl", w: 2.5, why: "Polish orthographic clusters" },
  { re: /(kh|gh|q|aa|ee|oo)/i, lang: "ar", w: 1.2, why: "Common Arabic transliteration signals (heuristic)" },
  { re: /(bin|binti|al-|abu)/i, lang: "ar", w: 2.0, why: "Arabic particles/transliteration" },
  { re: /(van|von|de|del|da|dos|di)\b/i, lang: "romance", w: 1.0, why: "Name particles often Romance/Germanic" },
  { re: /(ou|eau|gn|ille|eux)/i, lang: "fr", w: 1.5, why: "French orthography hints" },
  { re: /(sch|zsch|tsch|äu)/i, lang: "de", w: 1.5, why: "German orthography hints" },
  { re: /(nh|lh|ão|ães|eira)/i, lang: "pt", w: 1.8, why: "Portuguese orthography hints" },
  { re: /(ll|ñ|gue|gui)/i, lang: "es", w: 1.2, why: "Spanish orthography hints" },
  { re: /(shi|tsu|kyo|ryo|nya|kawa|sato)\b/i, lang: "ja", w: 1.8, why: "Japanese romaji patterns (heuristic)" },
  { re: /(kim|park|choi|lee|jung)\b/i, lang: "ko", w: 1.8, why: "Common Korean romanized surnames (heuristic)" },
  { re: /\b[xz]iao\b|\bzh|\bch|\bsh/i, lang: "zh_pinyin", w: 1.8, why: "Mandarin pinyin patterns (heuristic)" }
];

export function detectLanguage(raw) {
  const s = (raw ?? "").toString();
  const script = detectScript(s);

  // Script-based hard routing
  if (script === "Cyrillic") return { lang: "ru", confidence: 0.95, reasons: ["Cyrillic script detected"] };
  if (script === "Arabic") return { lang: "ar_script", confidence: 0.95, reasons: ["Arabic script detected"] };
  if (script === "Hebrew") return { lang: "he", confidence: 0.95, reasons: ["Hebrew script detected"] };
  if (script === "Devanagari") return { lang: "hi", confidence: 0.95, reasons: ["Devanagari script detected"] };
  if (script === "Han") return { lang: "zh", confidence: 0.95, reasons: ["Han characters detected"] };
  if (script === "Kana") return { lang: "ja", confidence: 0.95, reasons: ["Japanese kana detected"] };
  if (script === "Hangul") return { lang: "ko", confidence: 0.95, reasons: ["Hangul script detected"] };

  // Latin / Mixed: feature scoring
  const scores = new Map();
  const reasons = new Map();
  const add = (lang, w, why) => {
    scores.set(lang, (scores.get(lang) || 0) + w);
    if (!reasons.has(lang)) reasons.set(lang, []);
    reasons.get(lang).push(why);
  };

  for (const h of DIACRITIC_HINTS) if (h.re.test(s)) add(h.lang, h.w, h.why);
  for (const h of ORTHO_HINTS) if (h.re.test(stripDiacritics(s))) add(h.lang, h.w, h.why);

  // Basic fallback: if only ASCII, lean English
  const asciiOnly = /^[\x00-\x7F\s'".-]+$/.test(s);
  if (asciiOnly) add("en", 0.8, "ASCII-only input (weak English prior)");

  // If romance particle hint fired, distribute lightly
  if (scores.has("romance")) {
    const w = scores.get("romance");
    scores.delete("romance");
    add("es", w*0.33, "Romance particle heuristic");
    add("pt", w*0.33, "Romance particle heuristic");
    add("fr", w*0.34, "Romance particle heuristic");
  }

  // Determine best lang
  let best = "en";
  let bestScore = -1;
  for (const [k,v] of scores.entries()) {
    if (v > bestScore) { bestScore = v; best = k; }
  }
  if (bestScore < 0) return { lang: "en", confidence: 0.45, reasons: ["No strong signals; defaulting to English"] };

  // Confidence transform
  const confidence = Math.max(0.40, Math.min(0.95, 0.40 + (bestScore / 6.0)));
  return { lang: best, confidence, reasons: (reasons.get(best) || []).slice(0,4) };
}
