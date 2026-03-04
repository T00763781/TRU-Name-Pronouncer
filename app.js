/**
 * app.js — Name Pronunciation Tool (Text-only POC)
 *
 * Flow:
 *  1) Enter name
 *  2) Pick/edit syllable chips (each chip has alternatives)
 *  3) Generate a shareable card + HTML exports
 */

import { generateSyllableCandidates, escapeHTML } from "./engine/index.js";

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  name: "",
  syllables: [], // [{ selectedUpper, optionsUpper, stressed }]
  hint: ""
};

// ─── DOM Helpers ──────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function show(el) {
  if (typeof el === "string") el = $(el);
  el?.classList.remove("hidden");
}

function hide(el) {
  if (typeof el === "string") el = $(el);
  el?.classList.add("hidden");
}

function showStep(n) {
  document.querySelectorAll(".step").forEach(s => s.classList.add("hidden"));
  show(`step-${n}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function displayText(syl) {
  if (!syl) return "";
  return syl.stressed ? syl.selectedUpper.toUpperCase() : syl.selectedUpper.toLowerCase();
}

// ─── Step 1: Name Entry ───────────────────────────────────────────────────────
function runAnalysis() {
  const name = $("nameInput").value.trim();
  if (!name) return;

  const res = generateSyllableCandidates(name);

  state.name = res.name;
  state.syllables = (res.syllables || []).map(s => ({
    selectedUpper: s.baseUpper,
    optionsUpper: s.optionsUpper || [s.baseUpper],
    stressed: !!s.stressed
  }));

  // Badges / hints
  const badge = $("dictBadge");
  badge.textContent = res.dictHit ? "✓ Found in name dictionary" : "★ Best-guess breakdown";
  res.dictHit ? show(badge) : show(badge);

  const origin = $("originHint");
  origin.textContent = res.originHint || "";
  origin.textContent ? show(origin) : hide(origin);

  // Hint input reset (but keep if user reruns)
  $("hintInput").value = state.hint || "";

  renderSyllableEditor();
  showStep(2);
}

$("syllabifyBtn").addEventListener("click", runAnalysis);
$("nameInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") runAnalysis();
});

// ─── Step 2: Syllable Editor ──────────────────────────────────────────────────
function closeAllMenus() {
  document.querySelectorAll(".syl-menu").forEach(m => m.classList.add("hidden"));
  document.querySelectorAll(".syl-pill").forEach(p => p.classList.remove("menu-open"));
}

document.addEventListener("click", (e) => {
  // Close menus when clicking outside any pill
  if (!e.target.closest(".syl-pill")) closeAllMenus();
});

function renderSyllableEditor() {
  const editor = $("syllableEditor");
  editor.innerHTML = "";

  state.syllables.forEach((syl, i) => {
    const pill = document.createElement("div");
    pill.className = `syl-pill ${syl.stressed ? "stressed" : "unstressed"}`;
    pill.dataset.index = i;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "syl-btn";
    btn.title = "Choose a pronunciation";
    btn.innerHTML = `<span class="syl-text">${escapeHTML(displayText(syl))}</span><span class="syl-caret">▼</span>`;

    const menu = document.createElement("div");
    menu.className = "syl-menu hidden";

    // Options
    (syl.optionsUpper || [syl.selectedUpper]).forEach(opt => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "syl-option";
      item.textContent = opt; // options displayed in uppercase
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        syl.selectedUpper = opt;
        closeAllMenus();
        renderSyllableEditor();
      });
      menu.appendChild(item);
    });

    // Custom option
    const custom = document.createElement("button");
    custom.type = "button";
    custom.className = "syl-option syl-custom";
    custom.textContent = "Custom…";
    custom.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const val = prompt("Enter a custom syllable (e.g., DAY, vik, DEH):", displayText(syl));
      if (val && val.trim()) {
        syl.selectedUpper = val.trim().toUpperCase();
        closeAllMenus();
        renderSyllableEditor();
      }
    });
    menu.appendChild(custom);

    btn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const isOpen = !menu.classList.contains("hidden");
      closeAllMenus();
      if (!isOpen) {
        menu.classList.remove("hidden");
        pill.classList.add("menu-open");
      }
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "syl-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "×";
    removeBtn.title = "Remove syllable";
    removeBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      state.syllables.splice(i, 1);
      renderSyllableEditor();
    });

    pill.appendChild(btn);
    pill.appendChild(menu);
    pill.appendChild(removeBtn);
    editor.appendChild(pill);
  });

  // Add syllable button
  const addBtn = document.createElement("button");
  addBtn.className = "syl-add";
  addBtn.type = "button";
  addBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  addBtn.title = "Add syllable";
  addBtn.addEventListener("click", () => {
    state.syllables.push({ selectedUpper: "NEW", optionsUpper: ["NEW"], stressed: false });
    renderSyllableEditor();
  });
  editor.appendChild(addBtn);
}

// Continue to card
$("toCardBtn").addEventListener("click", () => {
  state.hint = $("hintInput").value.trim();
  renderCardAndExports();
  showStep(3);
});

// ─── Step 3: Card + Exports ───────────────────────────────────────────────────
function getSyllableString() {
  return state.syllables.map(displayText).join(" · ");
}

function renderCardAndExports() {
  $("cardName").textContent = state.name;
  $("cardSyllables").textContent = getSyllableString();
  $("cardHint").textContent = state.hint || "";
  state.hint ? $("cardHint").classList.remove("hidden") : $("cardHint").classList.add("hidden");

  const snippet = buildHtmlSnippet();
  $("htmlSnippetBlock").textContent = snippet;

  // simple preview badge
  $("badgePreview").innerHTML = buildBadgePreview();
}

function buildBadgePreview() {
  const name = escapeHTML(state.name);
  const syl = escapeHTML(getSyllableString());
  const hint = state.hint ? `<div style="margin-top:10px; font-size:14px; opacity:.9;">${escapeHTML(state.hint)}</div>` : "";
  return `
    <div style="border-radius:18px; padding:18px 18px 16px; background:#0c3a4e; color:white; font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;">
      <div style="font-size:28px; font-weight:700; letter-spacing:.02em;">${name}</div>
      <div style="margin-top:10px; font-size:16px; font-weight:700; letter-spacing:.16em; text-transform:none;">${syl}</div>
      ${hint}
    </div>
  `;
}

function buildHtmlSnippet() {
  const name = escapeHTML(state.name);
  const syl = escapeHTML(getSyllableString());
  const hint = state.hint ? escapeHTML(state.hint) : "";

  // Email/LMS safe: no scripts, inline styles only
  return `
<div style="font-family: Arial, sans-serif; max-width: 420px;">
  <div style="border-radius:18px; padding:16px 18px; background:#0c3a4e; color:#ffffff;">
    <div style="font-size:26px; font-weight:700; line-height:1.1;">${name}</div>
    <div style="margin-top:8px; font-size:14px; font-weight:700; letter-spacing:0.18em;">${syl}</div>
    ${hint ? `<div style="margin-top:10px; font-size:14px; opacity:0.95;">${hint}</div>` : ""}
  </div>
</div>`.trim();
}

function buildHostedPageHtml() {
  const snippet = buildHtmlSnippet();
  const title = escapeHTML(state.name) + " — Pronunciation";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${title}</title>
</head>
<body style="margin:0; padding:24px; background:#f6f7fb;">
  <div style="max-width:560px; margin:0 auto;">
    ${snippet}
    <div style="margin-top:14px; font-family: Arial, sans-serif; color:#334; font-size:12px; opacity:.8;">
      Generated with Say My Name (POC)
    </div>
  </div>
</body>
</html>`;
}

$("copyHtmlBtn").addEventListener("click", async () => {
  const txt = $("htmlSnippetBlock").textContent || "";
  try {
    await navigator.clipboard.writeText(txt);
    $("copyHtmlBtn").textContent = "Copied!";
    setTimeout(() => $("copyHtmlBtn").textContent = "Copy HTML", 900);
  } catch (e) {
    alert("Copy failed. You can manually select and copy the HTML snippet.");
  }
});

$("downloadPageBtn").addEventListener("click", () => {
  const html = buildHostedPageHtml();
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  const safe = state.name.replace(/[^a-z0-9_-]+/gi, "_").replace(/_+/g, "_").replace(/^_+|_+$/g, "");
  a.download = `${safe || "pronunciation"}_card.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
});

$("startOverBtn").addEventListener("click", () => {
  state.name = "";
  state.syllables = [];
  state.hint = "";
  $("nameInput").value = "";
  $("hintInput").value = "";
  closeAllMenus();
  showStep(1);
});
