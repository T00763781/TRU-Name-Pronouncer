import { syllabifyDisplay } from "./syllabify.js";
import { normalizeName } from "./utils.js";
import clusterMap from "../data/cluster_map.js";

// Display-only mapping helpers (no identity inference).
const CONS_REPLACERS = [
  ["sch", "SH"],
  ["sh", "SH"],
  ["ch", "CH"],
  ["th", "TH"],
  ["ph", "F"],
  ["ng", "NG"],
  ["qu", "KW"],
  ["ck", "K"],
];

const VOWEL_FALLBACK = ["UH", "EH", "EE"];

const WORDY_LABELS = new Map([
  ["tri", ["TREE", "TRI"]],
  ["dee", ["DEE"]],
  ["di", ["DEE", "DIH"]],
  ["vik", ["VIK", "VEEK"]],
  ["vee", ["VEEK", "VIK"]],
  ["day", ["DAY", "DEH", "DIE"]],
  ["nguy", ["NWIN", "NG-WIN"]],
  ["en", ["EN", "EHN"]],
]);

function dedupe(arr) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const key = (x || "").toUpperCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function replaceClusters(s) {
  let t = s;
  for (const [pat, rep] of CONS_REPLACERS) {
    t = t.replaceAll(pat, rep);
  }
  return t;
}

function bestVowelOptions(cluster) {
  const key = cluster.toLowerCase();
  if (clusterMap[key]) return clusterMap[key];

  // Heuristic fallbacks for unseen clusters
  if (key.includes("ee")) return ["EE", "IH"];
  if (key.includes("oo")) return ["OO", "UH"];
  if (key.includes("ai") || key.includes("ay")) return ["AY", "EYE", "EH"];
  if (key.includes("ie")) return ["EE", "EYE", "EH"];
  if (key.includes("ei")) return ["AY", "EE", "EH"];
  if (key.includes("ou")) return ["OW", "OO", "OH"];
  if (key.includes("au")) return ["AW", "OH"];
  if (key.includes("uy")) return ["WIN", "WEE", "OO"];
  return VOWEL_FALLBACK;
}

function toDisplayOptions(syl) {
  const raw = syl.toLowerCase();

  // Prefer curated “wordy” labels for recognizability
  const direct = WORDY_LABELS.get(raw);
  if (direct) return dedupe(direct);

  const m = raw.match(/[aeiouy]+/);
  if (!m) return [raw.toUpperCase()];

  const vowels = m[0];
  const parts = raw.split(vowels);
  const onset = parts[0] || "";
  const coda = parts[1] || "";

  const options = bestVowelOptions(vowels);
  const on = replaceClusters(onset);
  const co = replaceClusters(coda);

  const out = [];
  for (const v of options) {
    out.push(`${on}${v}${co}`.toUpperCase());
  }

  // Add a few readable alternates for common endings
  if (raw.endsWith("di")) out.unshift("DEE");
  if (raw.endsWith("vi")) out.unshift("VEE");
  if (raw === "ve") out.unshift("VUH");
  return dedupe(out);
}

export function generateSyllableCandidates(name) {
  const n = normalizeName(name);
  const sylls = syllabifyDisplay(n);

  const syllables = sylls.map((s) => {
    const optionsUpper = toDisplayOptions(s);
    const baseUpper = optionsUpper[0] || s.toUpperCase();
    return { baseUpper, optionsUpper };
  });

  return { name: n, syllables };
}
