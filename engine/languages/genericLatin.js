import { stripDiacritics } from "../utils.js";

// Extremely lightweight grapheme-to-phoneme approximation for Latin-script names.
// Intended as a robust fallback, not a perfect phonetic transcription.

const DIGRAPHS = [
  ["sch","ʃ"],["sh","ʃ"],["ch","tʃ"],["th","θ"],["ph","f"],["gh","g"],
  ["ng","ŋ"],["qu","kw"],["ck","k"],["wh","w"],["wr","r"],["kn","n"],
  ["ts","t͡s"],["cz","t͡ʂ"],["sz","ʂ"],["rz","ʐ"],["dj","dʒ"],["gj","dʒ"]
];

const VOWELS = new Set(["a","e","i","o","u","y"]);

export function g2p(word) {
  const w0 = (word ?? "").toString();
  const w = stripDiacritics(w0).toLowerCase();
  const phonemes = [];
  let i = 0;

  while (i < w.length) {
    let matched = false;
    for (const [g,p] of DIGRAPHS) {
      if (w.startsWith(g, i)) {
        phonemes.push(p);
        i += g.length;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const ch = w[i];

    if (VOWELS.has(ch)) {
      // crude vowel mapping
      if (ch === "a") phonemes.push("a");
      else if (ch === "e") phonemes.push("e");
      else if (ch === "i") phonemes.push("i");
      else if (ch === "o") phonemes.push("o");
      else if (ch === "u") phonemes.push("u");
      else if (ch === "y") phonemes.push("i"); // default y -> i
      i += 1;
      continue;
    }

    // consonants
    const map = {
      b:"b", c:"k", d:"d", f:"f", g:"g", h:"h", j:"dʒ",
      k:"k", l:"l", m:"m", n:"n", p:"p", q:"k", r:"r",
      s:"s", t:"t", v:"v", w:"w", x:"ks", z:"z"
    };
    if (map[ch]) phonemes.push(map[ch]);
    i += 1;
  }

  return { phonemes, meta: { system: "genericLatin" } };
}
