import { normalizeName, stripDiacritics, escapeHTML, detectScript } from "./utils.js";
import { tokenizeName } from "./tokenize.js";
import { detectLanguage } from "./langDetect.js";
import { getLanguageModule } from "./languageRegistry.js";
import { syllabifyPhonemes } from "./syllabify.js";
import { ipaJoin } from "./phonemes.js";
import { inferStress, applyStressToDisplay } from "./stress.js";
import { EN_NAME_DICT } from "./dictionaries/en_names.js";

function orthographicSyllabify(word) {
  const w = (word ?? "").toString();
  if (!w) return [];
  // Keep apostrophes inside token; split on vowel groups
  const V = /[aeiouyàáâäãåæèéêëìíîïòóôöõøœùúûüÿăâđêôơưăẹịộờừỳỹỷỵ]/i;
  const chars = [...w];
  const syllables = [];
  let buf = "";
  let inVowel = false;

  for (let i=0;i<chars.length;i++) {
    const ch = chars[i];
    const isV = V.test(ch);
    if (buf && isV !== inVowel && !isV) {
      // boundary between vowel group and consonant, keep consonant for next
      syllables.push(buf);
      buf = ch;
      inVowel = isV;
    } else {
      if (!buf) inVowel = isV;
      buf += ch;
      inVowel = isV;
    }
  }
  if (buf) syllables.push(buf);

  // Merge tiny leading consonants into next syllable
  if (syllables.length > 1 && !V.test(syllables[0]) && syllables[0].length <= 2) {
    syllables[1] = syllables[0] + syllables[1];
    syllables.shift();
  }
  return syllables.filter(Boolean);
}

function buildOriginHint(lang) {
  const l = (lang || "").toLowerCase();
  const hints = {
    en: "Likely English/anglicized spelling.",
    es: "Likely Spanish orthography (Romance-language patterns).",
    fr: "Likely French orthography.",
    de: "Likely German orthography.",
    pl: "Likely Polish orthography (Slavic patterns).",
    vi: "Likely Vietnamese Latin orthography.",
    zh_pinyin: "Looks like Mandarin pinyin (romanization).",
    ja: "Looks like Japanese romaji (romanization).",
    ar: "Looks like Arabic transliteration.",
    ar_script: "Arabic script detected.",
    hi: "Devanagari script detected (Hindi/related).",
    ru: "Cyrillic script detected (Russian/related).",
    ko: "Hangul script detected (Korean).",
    zh: "Han characters detected (Chinese).",
  };
  return hints[l] || "Language/origin uncertain — you may want to confirm with the person.";
}

function computeConfidence({ dictHit, langConfidence, stressConfidence, script }) {
  let c = 0.35;
  if (dictHit) c += 0.35;
  c += 0.25 * (langConfidence ?? 0.5);
  c += 0.15 * (stressConfidence ?? 0.55);
  if (script && script !== "Latin" && script !== "Mixed" && script !== "Unknown") c += 0.10;
  return Math.max(0.25, Math.min(0.95, c));
}

/**
 * Public API
 */
export function analyzeName(rawName, options = {}) {
  const name = normalizeName(rawName);
  const tokens = tokenizeName(name);
  const script = detectScript(name);

  // Identify "words" only (ignore separators) for analysis
  const wordTokens = tokens.filter(t => t.type === "word").map(t => t.value).filter(Boolean);

  // Per-token analysis and overall language guess
  const det = detectLanguage(name);
  const lang = det.lang || "en";

  const dictKey = stripDiacritics(name).toLowerCase();
  const dictHit = EN_NAME_DICT[dictKey] ? { syllables: EN_NAME_DICT[dictKey].slice() } : null;

  const module = getLanguageModule(lang);

  // For each word token, run g2p and syllabify IPA
  const parts = [];
  let allPh = [];
  for (const w of wordTokens) {
    const g = module.g2p(w);
    const ph = (g?.phonemes ?? []).slice();
    const syl = syllabifyPhonemes(ph, lang);
    parts.push({
      raw: w,
      phonemes: ph,
      ipa: ipaJoin(ph),
      syllablesIPA: syl.map(s => ipaJoin(s.phonemes)),
      meta: g?.meta ?? {}
    });
    // add a boundary marker between tokens to avoid merging
    if (allPh.length) allPh.push(" ");
    allPh = allPh.concat(ph);
  }

  // Display syllables: dictionary if exact single-token match; else orthographic per token
  let displaySyllables = null;
  if (dictHit) {
    displaySyllables = dictHit.syllables.slice();
  } else {
    // Build display syllables by concatenating per-token orthographic syllables
    displaySyllables = [];
    for (const w of wordTokens) {
      const syls = orthographicSyllabify(w);
      if (displaySyllables.length) displaySyllables.push("·");
      displaySyllables.push(...syls);
    }
  }

  // Stress inference
  const stress = inferStress({
    displaySyllables: dictHit ? displaySyllables : null,
    lang,
    syllableCount: displaySyllables.filter(s => s !== "·").length
  });

  // Apply stress to display syllables (skip separators)
  const stressedDisplay = (() => {
    if (!displaySyllables) return [];
    const out = [];
    let syllIndex = 0;
    for (const s of displaySyllables) {
      if (s === "·") { out.push(s); continue; }
      out.push(syllIndex === stress.index ? s.toUpperCase() : s);
      syllIndex++;
    }
    return out;
  })();

  const originHint = buildOriginHint(lang);
  const confidence = computeConfidence({
    dictHit: !!dictHit,
    langConfidence: det.confidence,
    stressConfidence: stress.confidence,
    script
  });

  const warnings = [];
  if (confidence < 0.55) warnings.push("Low confidence — consider asking the person for confirmation.");
  if (script === "Mixed") warnings.push("Mixed scripts detected — pronunciation is likely language-specific.");
  if (!wordTokens.length) warnings.push("No letters detected.");

  return {
    name,
    langGuess: { lang, confidence: det.confidence, reasons: det.reasons },
    script,
    parts,
    ipa: ipaJoin(allPh),
    displaySyllables: stressedDisplay,
    stress,
    originHint,
    confidence,
    warnings
  };
}

/**
 * Legacy-compatible helpers used by the existing UI.
 */
export function syllabifyName(name) {
  const r = analyzeName(name);
  // Convert display syllables to array without separators used by UI
  const syls = (r.displaySyllables || []).filter(s => s !== "·");
  return syls.length ? syls : [name];
}

export function isInDictionary(name) {
  const key = stripDiacritics(normalizeName(name)).toLowerCase();
  return !!EN_NAME_DICT[key];
}

export function getOriginHint(name) {
  const r = analyzeName(name);
  return r.originHint;
}

export { escapeHTML };
