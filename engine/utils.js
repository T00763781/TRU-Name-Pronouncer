export function normalizeName(input) {
  const s = (input ?? "").toString().trim().replace(/\s+/g, " ");
  return s.normalize("NFC");
}

export function stripDiacritics(s) {
  // For internal matching only; UI should keep user’s spelling.
  return s.normalize("NFD").replace(/\p{Diacritic}+/gu, "");
}

export function escapeHTML(str) {
  return (str ?? "").toString()
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function titleCaseName(name) {
  // Light touch: preserve original capitalization if present.
  const hasUpper = /[A-Z]/.test(name);
  if (hasUpper) return name;
  return name.replace(/(^|\s|[-'’])([a-z])/g, (_, p1, p2) => p1 + p2.toUpperCase());
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}
