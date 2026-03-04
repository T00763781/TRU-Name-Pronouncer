/**
 * app.js — TRU Pronounce (Text-only)
 * UI matches provided mock (editor card + preview card + save button).
 *
 * - Type a name → generates default syllables + alternatives
 * - Click a syllable chip → dropdown with alternatives + Custom…
 * - Plus button → add a syllable (Custom…)
 * - Save → downloads a shareable, self-contained HTML card (no audio)
 */

import { generateSyllableCandidates, escapeHTML } from "./engine/index.js";

const state = {
  name: "",
  syllables: [], // [{ selectedUpper, optionsUpper, stressed }]
  hint: ""
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

function ensureNonEmpty() {
  if (!state.name.trim()) {
    $("cardName").textContent = "";
    $("cardSyllables").innerHTML = "";
    $("cardHint").textContent = "";
  }
}

function analyzeName(preserveHint = true) {
  const raw = $("nameInput").value || "";
  const name = raw.trim();

  state.name = name;
  if (!name) {
    state.syllables = [];
    if (!preserveHint) state.hint = "";
    renderAll();
    return;
  }

  const res = generateSyllableCandidates(name);
  state.syllables = (res.syllables || []).map(s => ({
    selectedUpper: s.baseUpper,
    optionsUpper: (s.optionsUpper && s.optionsUpper.length ? s.optionsUpper : [s.baseUpper]),
    stressed: !!s.stressed
  }));

  // If hint input already has text, keep it; otherwise use stored
  if (!preserveHint) state.hint = "";
  if ($("hintInput").value.trim() === "" && state.hint) $("hintInput").value = state.hint;

  renderAll();
}

function renderSyllableEditor() {
  const wrap = $("syllableEditor");
  wrap.innerHTML = "";

  state.syllables.forEach((syl, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.textContent = displayText(syl).toUpperCase(); // editor chips are uppercase in mock

    const menu = document.createElement("div");
    menu.className = "menu hidden";
    menu.setAttribute("role", "menu");

    const opts = (syl.optionsUpper || []).slice(0, 10);
    opts.forEach(opt => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "menu-btn";
      item.textContent = opt;
      item.addEventListener("click", () => {
        syl.selectedUpper = opt.toUpperCase();
        menu.classList.add("hidden");
        renderAll();
      });
      menu.appendChild(item);
    });

    // Custom…
    const sep = document.createElement("div");
    sep.className = "menu-sep";
    menu.appendChild(sep);

    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "menu-btn";
    custom.textContent = "Custom…";
    custom.addEventListener("click", () => {
      const v = prompt("Custom syllable label (e.g., DAY, DEH, DIE):", syl.selectedUpper);
      if (v && v.trim()) {
        syl.selectedUpper = v.trim().toUpperCase();
        if (!syl.optionsUpper.includes(syl.selectedUpper)) syl.optionsUpper.unshift(syl.selectedUpper);
      }
      menu.classList.add("hidden");
      renderAll();
    });
    menu.appendChild(custom);

    btn.appendChild(menu);

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = !menu.classList.contains("hidden");
      closeAllMenus();
      if (!isOpen) menu.classList.remove("hidden");
    });

    wrap.appendChild(btn);
  });
}

function renderPreview() {
  $("cardName").textContent = state.name || "";

  const sylWrap = $("cardSyllables");
  sylWrap.innerHTML = "";
  state.syllables.forEach((syl) => {
    const pill = document.createElement("div");
    pill.className = "preview-chip";
    pill.textContent = displayText(syl);
    sylWrap.appendChild(pill);
  });

  const hint = (state.hint || "").trim();
  $("cardHint").textContent = hint;
}

function renderAll() {
  renderSyllableEditor();
  renderPreview();
  ensureNonEmpty();
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
  renderAll();
});

// Hint input
$("hintInput").addEventListener("input", () => {
  state.hint = $("hintInput").value || "";
  renderPreview();
});

// Live analysis (debounced)
let t = null;
$("nameInput").addEventListener("input", () => {
  window.clearTimeout(t);
  t = window.setTimeout(() => analyzeName(true), 180);
});

// Save: download a shareable card HTML
function buildCardHTML() {
  const safeName = escapeHTML(state.name || "");
  const safeHint = escapeHTML((state.hint || "").trim());
  const pills = state.syllables.map(s => escapeHTML(displayText(s))).join(" · ");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName} — Pronunciation</title>
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#ffffff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
  .card{width:min(640px,92vw);background:#0b2f3f;border-radius:34px;padding:26px 22px 28px;box-shadow:0 14px 30px rgba(0,0,0,.14);text-align:center;}
  .name{font-size:36px;font-weight:500;color:rgba(255,255,255,.95);}
  .pills{margin-top:18px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap;}
  .pill{background:#1a97aa;color:rgba(255,255,255,.95);border-radius:999px;padding:12px 22px;font-weight:800;font-size:18px;letter-spacing:.4px;min-width:92px;}
  .hint{margin-top:18px;font-size:18px;color:rgba(255,255,255,.9);}
  .sub{margin-top:10px;font-size:12px;color:rgba(255,255,255,.6);}
</style>
</head>
<body>
  <div class="card">
    <div class="name">${safeName}</div>
    <div class="pills">
      ${state.syllables.map(s => `<div class="pill">${escapeHTML(displayText(s))}</div>`).join("")}
    </div>
    ${safeHint ? `<div class="hint">${safeHint}</div>` : ""}
    <div class="sub">Generated with TRU Pronounce</div>
  </div>
</body>
</html>`;
}

$("saveBtn").addEventListener("click", async () => {
  if (!state.name.trim()) {
    toast("Add your name first");
    $("nameInput").focus();
    return;
  }
  const html = buildCardHTML();
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

  // Also try to copy a short plain-text version
  const plain = `${state.name}\n${state.syllables.map(displayText).join(" · ")}${state.hint.trim() ? `\n\n${state.hint.trim()}` : ""}`;
  try {
    await navigator.clipboard.writeText(plain);
    toast("Saved + copied to clipboard");
  } catch {
    toast("Saved");
  }
});

// Initial render
renderAll();
