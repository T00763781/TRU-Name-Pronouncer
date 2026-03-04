// Vietnamese Latin orthography → rough IPA-ish approximation.
// Vietnamese is tonal; we record tone marks in meta but do not synthesize tone in IPA fully.
import { stripDiacritics } from "../utils.js";

const TONE_RE = /[áàảãạắằẳẵặấầẩẫậéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

export function g2p(word) {
  const raw = (word ?? "").toString().toLowerCase().normalize("NFC");
  const hasTone = TONE_RE.test(raw);
  const w = stripDiacritics(raw);

  const phonemes = [];
  let i=0;
  const push=(p)=>{ if(p) phonemes.push(p); };

  while (i < w.length) {
    const rest = w.slice(i);

    if (rest.startsWith("ngh")) { push("ŋ"); i+=3; continue; }
    if (rest.startsWith("ng")) { push("ŋ"); i+=2; continue; }
    if (rest.startsWith("nh")) { push("ɲ"); i+=2; continue; }
    if (rest.startsWith("ph")) { push("f"); i+=2; continue; }
    if (rest.startsWith("th")) { push("tʰ"); i+=2; continue; }
    if (rest.startsWith("tr")) { push("ʈ"); i+=2; continue; }
    if (rest.startsWith("ch")) { push("c"); i+=2; continue; }
    if (rest.startsWith("kh")) { push("x"); i+=2; continue; }
    if (rest.startsWith("gi")) { push("z"); i+=2; continue; }

    const ch = w[i];
    if ("aeiouy".includes(ch)) {
      const vmap = {a:"a",e:"e",i:"i",o:"o",u:"u",y:"i"};
      push(vmap[ch]);
      i++; continue;
    }

    const cmap = {b:"b",c:"k",d:"z",đ:"ɗ",g:"ɣ",h:"h",k:"k",l:"l",m:"m",n:"n",p:"p",q:"k",r:"r",s:"s",t:"t",v:"v",x:"s"};
    push(cmap[ch] ?? "");
    i++;
  }

  return { phonemes: phonemes.filter(Boolean), meta: { system: "vi", hasTone } };
}
