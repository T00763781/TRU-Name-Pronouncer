import { stripDiacritics } from "../utils.js";

export function g2p(word) {
  const raw = (word ?? "").toString().toLowerCase();
  const w = raw.normalize("NFC");
  const plain = stripDiacritics(w);

  const phonemes = [];
  let i=0;
  const push = (p)=>{ if(p) phonemes.push(p); };

  while (i < w.length) {
    const rest = plain.slice(i);

    // common digraphs/trigraphs
    if (rest.startsWith("szcz")) { push("ʂt͡ʂ"); i+=4; continue; }
    if (rest.startsWith("sz")) { push("ʂ"); i+=2; continue; }
    if (rest.startsWith("cz")) { push("t͡ʂ"); i+=2; continue; }
    if (rest.startsWith("rz")) { push("ʐ"); i+=2; continue; }
    if (rest.startsWith("ch")) { push("x"); i+=2; continue; }
    if (rest.startsWith("dz")) { push("d͡z"); i+=2; continue; }

    const ch = w[i];

    if ("aąeęiouyó".includes(ch)) {
      const vmap = {a:"a","ą":"ɔ̃",e:"e","ę":"ɛ̃",i:"i",o:"ɔ",u:"u",y:"ɨ","ó":"u"};
      push(vmap[ch]);
      i++; continue;
    }

    const cmap = {
      b:"b", c:"t͡s", ć:"t͡ɕ", d:"d", f:"f", g:"g", h:"x", j:"j", k:"k",
      l:"l", ł:"w", m:"m", n:"n", ń:"ɲ", p:"p", r:"r", s:"s", ś:"ɕ",
      t:"t", w:"v", z:"z", ź:"ʑ", ż:"ʐ"
    };
    push(cmap[ch] ?? "");
    i++;
  }

  return { phonemes: phonemes.filter(Boolean), meta: { system: "pl" } };
}
