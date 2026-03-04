// Romaji → IPA-ish approximation (for names). Not pitch-accent aware.
import { stripDiacritics } from "../utils.js";

const MAP = [
  ["kyo","kjo"],["kyu","kju"],["kya","kja"],
  ["sho","ɕo"],["shu","ɕu"],["sha","ɕa"],
  ["cho","tɕo"],["chu","tɕu"],["cha","tɕa"],
  ["ryo","rjo"],["ryu","rju"],["rya","rja"],
  ["gyo","gjo"],["gyu","gju"],["gya","gja"],
  ["pyo","pjo"],["pyu","pju"],["pya","pja"],
  ["hyo","çjo"],["hyu","çju"],["hya","çja"],
  ["myo","mjo"],["myu","mju"],["mya","mja"],
  ["nyo","ɲo"],["nyu","ɲu"],["nya","ɲa"],
  ["shi","ɕi"],["chi","tɕi"],["tsu","t͡su"],["fu","ɸu"],
  ["ja","dʑa"],["ju","dʑu"],["jo","dʑo"],
  ["ka","ka"],["ki","ki"],["ku","ku"],["ke","ke"],["ko","ko"],
  ["sa","sa"],["su","su"],["se","se"],["so","so"],
  ["ta","ta"],["te","te"],["to","to"],
  ["na","na"],["ni","ni"],["nu","nu"],["ne","ne"],["no","no"],
  ["ha","ha"],["hi","çi"],["he","he"],["ho","ho"],
  ["ma","ma"],["mi","mi"],["mu","mu"],["me","me"],["mo","mo"],
  ["ya","ja"],["yu","ju"],["yo","jo"],
  ["ra","ɾa"],["ri","ɾi"],["ru","ɾu"],["re","ɾe"],["ro","ɾo"],
  ["wa","wa"],["wo","o"],["n","N"]
];

export function g2p(word) {
  const raw = stripDiacritics((word ?? "").toString().toLowerCase()).replace(/[^a-z]/g,"");
  if (!raw) return { phonemes: [], meta: { system: "ja_romaji" } };

  let w = raw;
  const phonemes = [];

  // gemination: small 'tt' etc.
  w = w.replace(/([bcdfghjklmnpqrstvwxyz])\1/g, "Q$1"); // Q indicates geminate stop
  // long vowels: oo/uu etc keep as ː
  w = w.replace(/aa/g,"aː").replace(/ii/g,"iː").replace(/uu/g,"uː").replace(/ee/g,"eː").replace(/oo/g,"oː");

  while (w.length) {
    let matched = false;
    for (const [g,p] of MAP) {
      if (w.startsWith(g)) {
        phonemes.push(p);
        w = w.slice(g.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (w.startsWith("Q")) { phonemes.push("ː"); w = w.slice(1); continue; }

    // fallback single char
    const ch = w[0];
    const cmap = {a:"a",i:"i",u:"u",e:"e",o:"o",k:"k",s:"s",t:"t",n:"n",h:"h",m:"m",y:"j",r:"ɾ",w:"w",g:"g",z:"z",d:"d",b:"b",p:"p",j:"dʑ"};
    phonemes.push(cmap[ch] ?? ch);
    w = w.slice(1);
  }

  return { phonemes: phonemes.filter(Boolean), meta: { system: "ja_romaji" } };
}
