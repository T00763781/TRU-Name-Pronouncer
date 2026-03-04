import { isVowelPhoneme } from "./phonemes.js";

// Language-specific onset clusters (subset; extensible)
const ONSETS = {
  en: new Set(["pr","pl","br","bl","tr","dr","kr","gr","fr","fl","θr","ʃr","sk","sp","st","sw","sl","sm","sn","tw","kw","gw","mj","nj","hj","vj"]),
  es: new Set(["pr","pl","br","bl","tr","dr","kr","gr","fr","fl","kl","gl"]),
  fr: new Set(["pr","pl","br","bl","tr","dr","kr","gr","fr","fl","kl","gl","ʃr"]),
  de: new Set(["pr","pl","br","bl","tr","dr","kr","gr","fr","fl","ʃt","ʃp","ʃm","ʃn"]),
  pl: new Set(["pr","pl","br","bl","tr","dr","kr","gr","fr","fl","ʂt͡ʂ","t͡s","t͡ʂ","d͡ʐ","ʐm","ʂn","ʂl"]),
  generic: new Set()
};

function canOnset(cluster, lang) {
  const set = ONSETS[lang] || ONSETS.generic;
  if (!cluster) return false;
  if (cluster.length <= 1) return true;
  return set.has(cluster);
}

/**
 * Syllabify IPA phoneme tokens using a maximal-onset strategy.
 * Input: array of phoneme tokens (strings) representing segments (not necessarily single chars).
 * Output: array of syllables, each syllable is { onset:[], nucleus:[], coda:[], phonemes:[] }
 */
export function syllabifyPhonemes(phonemes, lang = "generic") {
  const p = (phonemes ?? []).filter(Boolean);
  if (p.length === 0) return [];

  // Identify vowel positions
  const vIdx = [];
  for (let i=0;i<p.length;i++) if (isVowelPhoneme(p[i])) vIdx.push(i);

  // No vowels → treat as one syllable-like chunk
  if (vIdx.length === 0) {
    return [{ onset: p.slice(), nucleus: [], coda: [], phonemes: p.slice() }];
  }

  const syllables = [];
  let start = 0;

  for (let vi=0; vi<vIdx.length; vi++) {
    const v = vIdx[vi];
    // onset = everything from start..v-1
    const onset = p.slice(start, v);
    // nucleus = vowel (and following vowel-like modifiers until next consonant)
    let nucEnd = v+1;
    while (nucEnd < p.length && isVowelPhoneme(p[nucEnd])) nucEnd++;
    const nucleus = p.slice(v, nucEnd);

    // Determine boundary to next syllable
    const nextV = (vi+1 < vIdx.length) ? vIdx[vi+1] : null;
    if (nextV === null) {
      // last syllable: coda is rest
      const coda = p.slice(nucEnd);
      syllables.push({ onset, nucleus, coda, phonemes: onset.concat(nucleus, coda) });
      break;
    }

    const between = p.slice(nucEnd, nextV); // consonant cluster between nuclei
    // maximal onset: assign as much as possible to next onset while forming permissible onset
    let split = between.length; // split point: first split consonants as coda
    // Try smallest coda, biggest onset
    for (let k=0; k<=between.length; k++) {
      const codaCand = between.slice(0, k);
      const onsetCand = between.slice(k);
      const cluster = onsetCand.join("");
      // If onset cand empty or allowed
      if (onsetCand.length === 0 || canOnset(cluster, lang)) {
        split = k;
        break;
      }
    }
    const coda = between.slice(0, split);
    syllables.push({ onset, nucleus, coda, phonemes: onset.concat(nucleus, coda) });
    start = nucEnd + split;
  }

  return syllables;
}
