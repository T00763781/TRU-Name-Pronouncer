export const IPA_VOWELS = new Set([
  "a","e","i","o","u","æ","ɑ","ɒ","ɔ","ə","ɚ","ɝ","ɛ","ɜ","ɪ","ʊ","ʌ","ɐ","y","ø","œ","ɶ",
  "ɨ","ʉ","ɯ","ɤ","ɵ","ɞ"
]);

export function isVowelPhoneme(p) {
  if (!p) return false;
  // Strip length/stress/tone/diacritics
  const core = p.replace(/[ˈˌːˑ̩̯̃̊˞ˤˀʼʰʲʷːˑˈˌ0-9˥˦˧˨˩]/g, "");
  for (const ch of core) {
    if (IPA_VOWELS.has(ch)) return true;
  }
  return false;
}

export function ipaJoin(phonemes) {
  return (phonemes ?? []).join("");
}
