import { normalizeName, stripDiacritics, escapeHTML, detectScript } from "./utils.js";
import { tokenizeName } from "./tokenize.js";
import { detectLanguage } from "./langDetect.js";
import { getLanguageModule } from "./languageRegistry.js";
import { syllabifyPhonemes } from "./syllabify.js";
import { ipaJoin } from "./phonemes.js";
import { inferStress } from "./stress.js";
import { EN_NAME_DICT } from "./dictionaries/en_names.js";
import { syllableToLabel, generateLabelOptions, generateLabelOptionsFromLabel } from "./phoneticDisplay.js";

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
 * Public API: full analysis (still useful for debugging/diagnostics).
 */
export function analyzeName(rawName, options = {}) {
  const name = normalizeName(rawName);
  const tokens = tokenizeName(name);
  const script = detectScript(name);

  // Identify "words" only (ignore separators) for analysis
  const wordTokens = tokens.filter(t => t.type === "word").map(t => t.value).filter(Boolean);

  // Overall language guess
  const det = detectLanguage(name);
  const lang = det.lang || "en";

  const dictKey = stripDiacritics(name).toLowerCase();
  const dictHit = EN_NAME_DICT[dictKey] ? { syllables: EN_NAME_DICT[dictKey].slice() } : null;

  const module = getLanguageModule(lang);

  // Per-token analysis and syllabification
  const parts = [];
  let allPh = [];
  const phonemeSyllablesFlat = [];

  for (const w of wordTokens) {
    const g = module.g2p(w);
    const ph = (g?.phonemes ?? []).slice();
    const syl = syllabifyPhonemes(ph, lang);

    parts.push({
      raw: w,
      phonemes: ph,
      ipa: ipaJoin(ph),
      syllables: syl, // keep full syllable objects for UI candidate generation
      syllablesIPA: syl.map(s => ipaJoin(s.phonemes)),
      meta: g?.meta ?? {}
    });

    for (const s of syl) phonemeSyllablesFlat.push(s);

    // add a boundary marker between tokens to avoid merging
    if (allPh.length) allPh.push(" ");
    allPh = allPh.concat(ph);
  }

  // Build base display syllables (uppercase) for UI:
  // - If exact dictionary hit, trust curated syllables
  // - Else, derive from phoneme syllables → common-sense labels
  const baseSyllablesUpper = (() => {
    if (dictHit) return dictHit.syllables.map(s => (s ?? "").toString().toUpperCase()).filter(Boolean);
    if (phonemeSyllablesFlat.length) return phonemeSyllablesFlat.map(syllableToLabel).filter(Boolean);
    return [name.toUpperCase()];
  })();

  // Stress inference (index into syllables)
  const stress = inferStress({
    displaySyllables: dictHit ? baseSyllablesUpper : null,
    lang,
    syllableCount: baseSyllablesUpper.length
  });

  // Apply stress casing convention:
  // - stressed syllable: UPPERCASE
  // - unstressed syllables: lowercase
  const displaySyllables = baseSyllablesUpper.map((s, i) => (i === stress.index ? s.toUpperCase() : s.toLowerCase()));

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
    // UI-friendly syllables:
    baseSyllablesUpper,
    displaySyllables,
    stress,
    originHint,
    confidence,
    warnings,
    dictHit: !!dictHit,
    dictSyllables: dictHit ? dictHit.syllables.slice() : null,
    phonemeSyllablesFlat: dictHit ? null : phonemeSyllablesFlat
  };
}

/**
 * New: Syllable candidates for dropdown selection (engine default + alternatives).
 * Returns uppercase options; UI can apply stress casing for display.
 */
export function generateSyllableCandidates(rawName) {
  const r = analyzeName(rawName);
  const lang = r.langGuess?.lang || "en";

  const syllables = r.baseSyllablesUpper.map((baseUpper, i) => {
    const stressed = i === r.stress.index;

    let optionsUpper = [];
    if (r.dictHit) {
      optionsUpper = generateLabelOptionsFromLabel(baseUpper);
    } else if (r.phonemeSyllablesFlat && r.phonemeSyllablesFlat[i]) {
      optionsUpper = generateLabelOptions(r.phonemeSyllablesFlat[i], lang);
    } else {
      optionsUpper = [baseUpper];
    }

    // Guarantee base first
    if (!optionsUpper.includes(baseUpper)) optionsUpper.unshift(baseUpper);
    optionsUpper = optionsUpper.slice(0, 6);

    return { baseUpper, stressed, optionsUpper };
  });

  return {
    name: r.name,
    syllables,
    langGuess: r.langGuess,
    originHint: r.originHint,
    confidence: r.confidence,
    warnings: r.warnings,
    dictHit: r.dictHit
  };
}

/**
 * Legacy-compatible helpers used by the existing UI.
 */
export function syllabifyName(name) {
  const r = analyzeName(name);
  return (r.displaySyllables && r.displaySyllables.length) ? r.displaySyllables.slice() : [name];
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
