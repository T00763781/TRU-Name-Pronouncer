/**
 * app.js — TRU Pronounce (Text-only)
 * “Savant” UX pass:
 *  - Auto analysis as you type (debounced)
 *  - Syllable chips with dropdown alternatives + Custom…
 *  - Auto-filled plain-language hint (editable)
 *  - Confidence/origin meta badges + warnings
 *  - Copy (text), Copy (HTML), Reset to engine guess
 *  - Create card downloads a self-contained HTML page
 */

import { generateSyllableCandidates, escapeHTML } from "./engine/index.js";

const LANG_LABEL = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  pl: "Polish",
  vi: "Vietnamese",
  tr: "Turkish",
  zh_pinyin: "Mandarin (pinyin)",
  ja: "Japanese (romaji)",
  ar: "Arabic (romanized)",
  ar_script: "Arabic",
  hi: "Devanagari",
  ru: "Cyrillic",
  ko: "Korean",
  zh: "Chinese"
};

const state = {
  name: "",
  syllables: [],     // [{ selectedUpper, optionsUpper, stressed }]
  hint: "",
  // baselines for Reset
  baseline: null,    // { syllables, hint }
  userEditedHint: false
};

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.add("hidden"), 2200);
}

function displayText(syl) {
  if (!syl) return "";
  return syl.stressed ? syl.selectedUpper.toUpperCase() : syl.selectedUpper.toLowerCase();
}

function closeAllMenus() {
  document.querySelectorAll(".menu").forEach(m => m.classList.add("hidden"));
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".chip")) closeAllMenus();
});

function deepCopySyllables(arr) {
  return (arr || []).map(s => ({
    selectedUpper: s.selectedUpper,
    optionsUpper: (s.optionsUpper || []).slice(),
    stressed: !!s.stressed
  }));
}

function setExamplesVisible(on) {
  const ex = $("examples");
  if (!ex) return;
  if (on) ex.classList.remove("hidden");
  else ex.classList.add("hidden");
}

function formatConfidence(c) {
  if (typeof c !== "number") return "";
  return `${Math.round(c * 100)}%`;
}

function buildAutoHint(name, syllables) {
  // Goal: always provide something useful, never overly “confident”.
  // 1) If the breakdown is empty, return blank.
  const parts = (syllables || []).map(s => displayText(s)).filter(Boolean);
  if (!name || !parts.length) return "";

  // 2) Friendly “sounds like …” with hyphenation.
  const hyph = parts.join("-");
  // 3) Add stress cue if we can
  const stressIdx = (syllables || []).findIndex(s => s.stressed);
  if (stressIdx >= 0 && parts.length > 1) {
    return `Sounds like "${hyph}" (stress on "${parts[stressIdx]}").`;
  }
  return `Sounds like "${hyph}".`;
}

function updateMeta(res) {
  const primary = $("metaPrimary");
  const secondary = $("metaSecondary");
  if (!primary || !secondary) return;

  if (!res || !state.name.trim()) {
    primary.textContent = "";
    secondary.textContent = "";
    return;
  }

  const dict = res.dictHit ? "Dictionary match" : "Best guess";
  const lang = res.langGuess?.lang ? (LANG_LABEL[res.langGuess.lang] || res.langGuess.lang) : "Unknown origin";
  const conf = formatConfidence(res.confidence ?? res.langGuess?.confidence ?? 0.5);

  primary.textContent = `${dict} · Likely ${lang}`;
  secondary.textContent = conf ? `${conf} confidence` : "";
}

function updateWarnings(res) {
  const el = $("warnings");
  if (!el) return;

  const w = (res && Array.isArray(res.warnings)) ? res.warnings.filter(Boolean) : [];
  if (!state.name.trim() || w.length === 0) {
    el.classList.add("hidden");
    el.textContent = "";
    return;
  }
  el.classList.remove("hidden");
  el.textContent = w.slice(0, 2).join("  ");
}

function analyzeName() {
  const name = ($("nameInput").value || "").trim();
  state.name = name;

  setExamplesVisible(!name);

  if (!name) {
    state.syllables = [];
    state.baseline = null;
    if (!state.userEditedHint) {
      state.hint = "";
      $("hintInput").value = "";
    }
    updateMeta(null);
    updateWarnings(null);
    renderAll();
    return;
  }

  const res = generateSyllableCandidates(name);

  state.syllables = (res.syllables || []).map(s => ({
    selectedUpper: s.baseUpper,
    optionsUpper: (s.optionsUpper && s.optionsUpper.length ? s.optionsUpper : [s.baseUpper]),
    stressed: !!s.stressed
  }));

  // Auto-hint unless user has started editing.
  if (!state.userEditedHint) {
    const autoHint = buildAutoHint(state.name, state.syllables);
    state.hint = autoHint;
    $("hintInput").value = autoHint;
  }

  // Baseline for Reset (includes auto-hint at time of generation)
  state.baseline = {
    syllables: deepCopySyllables(state.syllables),
    hint: buildAutoHint(state.name, state.syllables)
  };

  updateMeta(res);
  updateWarnings(res);
  renderAll();
}

function renderSyllableEditor() {
  const wrap = $("syllableEditor");
  wrap.innerHTML = "";

  state.syllables.forEach((syl, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = displayText(syl).toUpperCase(); // editor chips are uppercase

    const menu = document.createElement("div");
    menu.className = "menu hidden";
    menu.setAttribute("role", "menu");

    const opts = (syl.optionsUpper || []).slice(0, 10);
    opts.forEach(opt => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "menu-btn";
      item.setAttribute("role", "menuitem");
      item.textContent = opt;
      if (opt.toUpperCase() === syl.selectedUpper.toUpperCase()) {
        item.setAttribute("aria-current", "true");
      }
      item.addEventListener("click", () => {
        syl.selectedUpper = opt.toUpperCase();
        menu.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
        renderAll();
      });
      menu.appendChild(item);
    });

    const sep = document.createElement("div");
    sep.className = "menu-sep";
    menu.appendChild(sep);

    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "menu-btn";
    custom.setAttribute("role", "menuitem");
    custom.textContent = "Custom…";
    custom.addEventListener("click", () => {
      const v = prompt("Custom syllable label (e.g., DAY, DEH, DIE):", syl.selectedUpper);
      if (v && v.trim()) {
        syl.selectedUpper = v.trim().toUpperCase();
        if (!syl.optionsUpper.includes(syl.selectedUpper)) syl.optionsUpper.unshift(syl.selectedUpper);
      }
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
      renderAll();
    });
    menu.appendChild(custom);

    btn.appendChild(menu);

    function toggle(open) {
      const isOpen = !menu.classList.contains("hidden");
      const next = (typeof open === "boolean") ? open : !isOpen;
      closeAllMenus();
      if (next) {
        menu.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
        // focus first menu item for keyboard users
        const first = menu.querySelector(".menu-btn");
        if (first) first.focus();
      } else {
        menu.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
      }
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle(true);
      }
      if (e.key === "Escape") {
        e.preventDefault();
        closeAllMenus();
      }
    });

    // basic remove gesture: Alt+Backspace removes syllable (power user / low clutter)
    btn.addEventListener("keyup", (e) => {
      if (e.altKey && (e.key === "Backspace" || e.key === "Delete")) {
        state.syllables.splice(idx, 1);
        renderAll();
        toast("Removed syllable");
      }
    });

    wrap.appendChild(btn);
  });
}

function renderPreview() {
  const nameEl = $("cardName");
  const sylWrap = $("cardSyllables");
  const hintEl = $("cardHint");

  nameEl.textContent = state.name || "";

  sylWrap.innerHTML = "";
  state.syllables.forEach((syl) => {
    const pill = document.createElement("div");
    pill.className = "preview-chip" + (syl.stressed ? " stress" : "");
    pill.textContent = displayText(syl);
    sylWrap.appendChild(pill);
  });

  hintEl.textContent = (state.hint || "").trim();
}

function renderAll() {
  renderSyllableEditor();
  renderPreview();

  // disable actions when empty
  const disabled = !state.name.trim();
  $("saveBtn").disabled = disabled;
  $("copyBtn").disabled = disabled;
  $("copyHtmlBtn").disabled = disabled;
  $("resetBtn").disabled = disabled;
  $("saveBtn").style.opacity = disabled ? "0.75" : "1";
}

// Plus button: add a new syllable
$("addSyllableBtn").addEventListener("click", () => {
  if (!state.name.trim()) {
    toast("Type a name first");
    $("nameInput").focus();
    return;
  }
  const v = prompt("New syllable label:", "NEW");
  if (!v || !v.trim()) return;

  state.syllables.push({
    selectedUpper: v.trim().toUpperCase(),
    optionsUpper: [v.trim().toUpperCase()],
    stressed: false
  });

  // Recompute hint unless user edited
  if (!state.userEditedHint) {
    const auto = buildAutoHint(state.name, state.syllables);
    state.hint = auto;
    $("hintInput").value = auto;
  }

  renderAll();
});

// Hint input: mark as user-edited on first edit
$("hintInput").addEventListener("input", () => {
  const v = $("hintInput").value || "";
  if (!state.userEditedHint && v.trim() !== (state.baseline?.hint || "").trim()) {
    state.userEditedHint = true;
  }
  state.hint = v;
  renderPreview();
});

// Examples: click to insert
document.querySelectorAll(".example-chip").forEach((b) => {
  b.addEventListener("click", () => {
    const nm = b.getAttribute("data-name") || "";
    $("nameInput").value = nm;
    state.userEditedHint = false;
    analyzeName();
    $("nameInput").focus();
  });
});

// Live analysis (debounced)
let t = null;
$("nameInput").addEventListener("input", () => {
  window.clearTimeout(t);
  t = window.setTimeout(() => {
    state.userEditedHint = false; // new name resets hint ownership
    analyzeName();
  }, 180);
});

// Copy (text)
async function copyText() {
  if (!state.name.trim()) return;
  const plain = `${state.name}\n${state.syllables.map(displayText).join(" · ")}${(state.hint || "").trim() ? `\n\n${(state.hint || "").trim()}` : ""}`;
  try {
    await navigator.clipboard.writeText(plain);
    toast("Copied");
  } catch {
    toast("Couldn’t copy (browser blocked).");
  }
}

// Copy (HTML)
async function copyHtml() {
  if (!state.name.trim()) return;
  const html = buildCardHTML(true); // snippet mode
  try {
    await navigator.clipboard.writeText(html);
    toast("HTML copied");
  } catch {
    toast("Couldn’t copy HTML (browser blocked).");
  }
}

$("copyBtn").addEventListener("click", copyText);
$("copyHtmlBtn").addEventListener("click", copyHtml);

// Reset
$("resetBtn").addEventListener("click", () => {
  if (!state.baseline) return;
  state.syllables = deepCopySyllables(state.baseline.syllables);
  state.userEditedHint = false;
  state.hint = state.baseline.hint || "";
  $("hintInput").value = state.hint;
  renderAll();
  toast("Reset");
});

// Build downloadable card HTML; if snippet=true, returns just a div block suitable for LMS/email.
function buildCardHTML(snippet = false) {
  const safeName = escapeHTML(state.name || "");
  const safeHint = escapeHTML((state.hint || "").trim());

  const pillsHtml = state.syllables.map(s => {
    const txt = escapeHTML(displayText(s));
    const cls = s.stressed ? "pill stress" : "pill";
    return `<div class="${cls}">${txt}</div>`;
  }).join("");

  const inner = `
  <div class="card">
    <div class="name">${safeName}</div>
    <div class="pills">${pillsHtml}</div>
    ${safeHint ? `<div class="hint">${safeHint}</div>` : ""}
    <div class="foot">Pronunciation guide</div>
  </div>`.trim();

  const css = `
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#ffffff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
  .card{width:min(680px,92vw);background:#0b2f3f;border-radius:34px;padding:26px 22px 22px;box-shadow:0 14px 30px rgba(0,0,0,.14);text-align:center;}
  .name{font-size:36px;font-weight:500;color:rgba(255,255,255,.95);}
  .pills{margin-top:18px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap;}
  .pill{background:#1a97aa;color:rgba(255,255,255,.95);border-radius:999px;padding:12px 22px;font-weight:800;font-size:18px;letter-spacing:.4px;min-width:92px;position:relative;}
  .pill.stress{transform:scale(1.04);box-shadow:0 10px 22px rgba(0,0,0,.16);}
  .pill.stress::after{content:"";position:absolute;left:18px;right:18px;bottom:8px;height:2px;border-radius:2px;background:rgba(255,255,255,.55);}
  .hint{margin-top:18px;font-size:18px;color:rgba(255,255,255,.9);}
  .foot{margin-top:10px;font-size:12px;color:rgba(255,255,255,.62);}
  `.trim();

  if (snippet) {
    return `<div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif">${inner}</div>`;
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName} — Pronunciation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
}

// Create card (download) + copy text
$("saveBtn").addEventListener("click", async () => {
  if (!state.name.trim()) {
    toast("Add your name first");
    $("nameInput").focus();
    return;
  }

  const html = buildCardHTML(false);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const base = state.name.trim().replace(/\s+/g, "-").replace(/[^A-Za-z0-9\-]/g, "");
  a.download = `${base || "name"}-pronunciation.html`;
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  await copyText();
});

// Initial
setExamplesVisible(true);
renderAll();
updateMeta(null);
updateWarnings(null);
