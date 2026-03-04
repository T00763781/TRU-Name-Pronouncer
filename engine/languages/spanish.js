import { stripDiacritics } from "../utils.js";

export function g2p(word) {
  const raw = (word ?? "").toString().toLowerCase();
  const w = raw.normalize("NFC");
  const plain = stripDiacritics(w);

  const phonemes = [];
  let i=0;

  const push = (p) => { if (p) phonemes.push(p); };

  while (i < w.length) {
    const rest = w.slice(i);

    // digraphs
    if (rest.startsWith("ch")) { push("tʃ"); i+=2; continue; }
    if (rest.startsWith("ll")) { push("ʝ"); i+=2; continue; } // yeísmo default
    if (rest.startsWith("rr")) { push("r"); i+=2; continue; }
    if (rest.startsWith("qu")) { push("k"); i+=2; continue; }
    if (rest.startsWith("gu")) { 
      // gue/gui hard g, u silent (approx)
      if (i+2 < w.length && "eéií".includes(w[i+2])) { push("g"); i+=2; continue; }
    }

    const ch = w[i];
    // vowels (keep accent info in meta)
    if ("aeiouáéíóúü".includes(ch)) {
      const vmap = {a:"a",e:"e",i:"i",o:"o",u:"u","á":"a","é":"e","í":"i","ó":"o","ú":"u","ü":"u"};
      push(vmap[ch]);
      i++; continue;
    }

    const cmap = {
      b:"b", c:"k", d:"d", f:"f", g:"g", h:"", j:"x", k:"k", l:"l",
      m:"m", n:"n", ñ:"ɲ", p:"p", r:"ɾ", s:"s", t:"t", v:"b", w:"w", x:"ks", y:"ʝ", z:"s"
    };
    if (ch === "c") {
      const nxt = plain[i+1] || "";
      push(("eéií".includes(w[i+1]) || "ei".includes(nxt)) ? "s" : "k");
    } else if (ch === "g") {
      const nxt = plain[i+1] || "";
      push(("eéií".includes(w[i+1]) || "ei".includes(nxt)) ? "x" : "g");
    } else {
      push(cmap[ch] ?? "");
    }
    i++;
  }

  // Accent detection: if any accented vowel, use that syllable for stress in analyzer.
  const hasAccent = /[áéíóú]/.test(w);

  return { phonemes: phonemes.filter(Boolean), meta: { system: "es", hasAccent } };
}
