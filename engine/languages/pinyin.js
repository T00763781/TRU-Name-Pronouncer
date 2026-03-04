// Mandarin Pinyin (romanized) → rough IPA-ish approximation.
// Not intended for full Mandarin synthesis; good enough for name cues.
import { stripDiacritics } from "../utils.js";

const INITIALS = [
  ["zh","ʈ͡ʂ"],["ch","ʈ͡ʂʰ"],["sh","ʂ"],["b","p"],["p","pʰ"],["m","m"],["f","f"],
  ["d","t"],["t","tʰ"],["n","n"],["l","l"],["g","k"],["k","kʰ"],["h","x"],
  ["j","t͡ɕ"],["q","t͡ɕʰ"],["x","ɕ"],["r","ɻ"],["z","t͡s"],["c","t͡sʰ"],["s","s"],
  ["y","j"],["w","w"]
];

export function g2p(word) {
  const raw = (word ?? "").toString().toLowerCase();
  const w = stripDiacritics(raw).replace(/[^a-z0-9]/g,"");
  if (!w) return { phonemes: [], meta: { system: "zh_pinyin" } };

  // split into syllables by digits (tone) or crude vowel boundaries
  const parts = w.split(/(?=[1-5])|-/).filter(Boolean);

  const phonemes = [];
  const tones = [];
  for (const part0 of parts) {
    const m = part0.match(/^([a-z]+)([1-5])?$/);
    if (!m) continue;
    let syl = m[1];
    const tone = m[2] ? parseInt(m[2],10) : null;
    tones.push(tone);

    // initial
    let init = "";
    for (const [g,p] of INITIALS) {
      if (syl.startsWith(g)) { init = p; syl = syl.slice(g.length); break; }
    }
    if (init) phonemes.push(init);

    // finals (very rough)
    const finals = syl
      .replace(/^iu$/,"jou")
      .replace(/^ui$/,"wei")
      .replace(/^un$/,"wən")
      .replace(/ang$/,"ɑŋ")
      .replace(/eng$/,"əŋ")
      .replace(/ong$/,"ʊŋ")
      .replace(/ian$/,"jɛn")
      .replace(/uan$/,"wan")
      .replace(/uan$/,"wan")
      .replace(/an$/,"an")
      .replace(/en$/,"ən")
      .replace(/in$/,"in")
      .replace(/ai$/,"ai")
      .replace(/ei$/,"ei")
      .replace(/ao$/,"au")
      .replace(/ou$/,"ou")
      .replace(/ia$/,"ja")
      .replace(/ie$/,"jɛ")
      .replace(/ua$/,"wa")
      .replace(/uo$/,"wo")
      .replace(/u$/,"u")
      .replace(/i$/,"i")
      .replace(/a$/,"a")
      .replace(/e$/,"ɤ")
      .replace(/o$/,"o");

    phonemes.push(finals);
  }

  return { phonemes: phonemes.filter(Boolean), meta: { system: "zh_pinyin", tones } };
}
