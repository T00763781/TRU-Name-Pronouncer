// Tokenize names while preserving separators
import { normalizeName, isLetterLike } from "./utils.js";

export function tokenizeName(raw) {
  const s = normalizeName(raw);
  const out = [];
  let buf = "";
  let mode = null; // "word" | "sep" | null
  const flush = () => {
    if (!buf) return;
    out.push({ type: mode, value: buf });
    buf = "";
    mode = null;
  };

  for (const ch of s) {
    const isWord = isLetterLike(ch) || ch === "'" || ch === "’" || ch === "."; // keep initials/prefixes
    const t = isWord ? "word" : "sep";
    if (mode && t !== mode) flush();
    mode = t;
    buf += ch;
  }
  flush();

  // Normalize separators: treat consecutive seps as one
  return out.map(t => {
    if (t.type === "sep") return { ...t, value: t.value.replace(/\s+/g, " ") };
    return t;
  });
}

export function joinTokens(tokens) {
  return tokens.map(t => t.value).join("");
}
