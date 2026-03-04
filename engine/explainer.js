import cueWords from "../data/cue_words.js";

function normalizeLabelForCue(label) {
  const up = (label || "").toUpperCase().replace(/[^A-Z-]/g, "");
  // If a label has hyphen, prefer each part
  return up;
}

function cueForLabel(label) {
  const up = normalizeLabelForCue(label);
  if (cueWords[up]) return cueWords[up];

  // Try to derive cues from parts (e.g., NG-WIN)
  if (up.includes("-")) {
    const parts = up.split("-").filter(Boolean);
    const cues = parts.map(p => cueWords[p]).filter(Boolean);
    if (cues.length) return cues.join(" + ");
  }

  // Derive from common vowel markers inside the label
  // e.g., KEE -> EE
  const vowelHints = [
    ["AY", "as in “day”"],
    ["EE", "as in “see”"],
    ["EH", "as in “bed”"],
    ["IH", "as in “sit”"],
    ["OH", "as in “go”"],
    ["OO", "as in “food”"],
    ["UH", "as in “sofa” (uh)"],
    ["AH", "as in “father”"],
    ["OW", "as in “cow”"],
    ["AW", "as in “saw”"],
    ["ER", "as in “her”"],
  ];
  for (const [key, val] of vowelHints) {
    if (up.includes(key)) return val;
  }
  return "";
}

export function buildExplainer(name, syllableLabelsLower) {
  const labels = (syllableLabelsLower || []).map(s => (s || "").trim()).filter(Boolean);
  if (!name || !labels.length) {
    return {
      oneLine: "",
      cuesLine: "",
      scriptLine: ""
    };
  }

  const say = labels.join("-");
  const oneLine = `Say: ${say}.`;

  const cues = labels
    .map(l => cueForLabel(l.toUpperCase()))
    .filter(Boolean);

  const cuesLine = cues.length
    ? `Cues: ${labels.map((l, i) => {
        const cue = cues[i] || cueForLabel(l.toUpperCase());
        return cue ? `${l} (${cue})` : l;
      }).join(" · ")}`
    : "Tip: If you’re unsure, add a cue like “rhymes with…” or “like…”.";

  const scriptLine = `If you’re unsure: “Could you help me pronounce your name the way you prefer?”`;

  return { oneLine, cuesLine, scriptLine };
}
