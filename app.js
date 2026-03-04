/**
 * app.js — TRU Pronounce (Text-only, safer UX)
 *
 * Two modes:
 *  - Single name: editable syllable chips + gentle hint + downloadable card
 *  - Class list: paste many names → generate starting points → open any entry to refine
 *
 * No interpretive labeling.
 */

import { generateSyllableCandidates, escapeHTML } from "./engine/index.js";

const state = {
  mode: "single",        // 'single' | 'list'
  name: "",
  syllables: [],         // [{ selectedUpper, optionsUpper }]
  hint: "",
  baseline: null,        // { syllables, hint }
  userEditedHint: false,
  list: []               // [{ name, syllablesUpper:[], hint, rawSyllables:[] }]
};

const $ = (id) => document.getElementById(id);

function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  window.clearTimeout(toast._t);
  toast._t = window.setTimeout(() => el.classList.add("hidden"), 2200);
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
    optionsUpper: (s.optionsUpper || []).slice()
  }));
}

function setExamplesVisible(on) {
  const ex = $("examples");
  if (!ex) return;
  if (on) ex.classList.remove("hidden");
  else ex.classList.add("hidden");
}

function previewLabel(syl) {
  if (!syl) return "";
  return (syl.selectedUpper || "").toLowerCase();
}

function editorLabel(syl) {
  if (!syl) return "";
  return (syl.selectedUpper || "").toUpperCase();
}

function autoHint(name, syllables) {
  const parts = (syllables || []).map(previewLabel).filter(Boolean);
  if (!name || !parts.length) return "";
  return `Try: ${parts.join("-")}.`;
}

function syncHintIfNotEdited() {
  if (state.userEditedHint) return;
  const h = autoHint(state.name, state.syllables);
  state.hint = h;
  $("hintInput").value = h;
}

function setMode(next) {
  state.mode = next;

  const singleBtn = $("modeSingle");
  const listBtn = $("modeList");

  const singlePane = $("singlePane");
  const listPane = $("listPane");

  const singlePreview = $("singlePreview");
  const listPreview = $("listPreview");

  if (next === "single") {
    singleBtn.classList.add("active");
    singleBtn.setAttribute("aria-selected", "true");
    listBtn.classList.remove("active");
    listBtn.setAttribute("aria-selected", "false");

    singlePane.classList.remove("hidden");
    listPane.classList.add("hidden");

    singlePreview.classList.remove("hidden");
    listPreview.classList.add("hidden");

    $("nameInput").focus();
  } else {
    listBtn.classList.add("active");
    listBtn.setAttribute("aria-selected", "true");
    singleBtn.classList.remove("active");
    singleBtn.setAttribute("aria-selected", "false");

    listPane.classList.remove("hidden");
    singlePane.classList.add("hidden");

    listPreview.classList.remove("hidden");
    singlePreview.classList.add("hidden");

    $("listInput").focus();
  }
}

$("modeSingle").addEventListener("click", () => setMode("single"));
$("modeList").addEventListener("click", () => setMode("list"));

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
    renderAll();
    return;
  }

  const res = generateSyllableCandidates(name);
  state.syllables = (res.syllables || []).map(s => ({
    selectedUpper: (s.baseUpper || "").toUpperCase(),
    optionsUpper: (s.optionsUpper && s.optionsUpper.length)
      ? s.optionsUpper.map(x => (x || "").toUpperCase())
      : [(s.baseUpper || "").toUpperCase()]
  }));

  state.baseline = {
    syllables: deepCopySyllables(state.syllables),
    hint: autoHint(state.name, state.syllables)
  };

  syncHintIfNotEdited();
  renderAll();
}

function renderSyllableEditor() {
  const wrap = $("syllableEditor");
  wrap.innerHTML = "";

  state.syllables.forEach((syl) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.setAttribute("aria-haspopup", "menu");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = editorLabel(syl);

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
        syncHintIfNotEdited();
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
        const next = v.trim().toUpperCase();
        syl.selectedUpper = next;
        if (!syl.optionsUpper.includes(next)) syl.optionsUpper.unshift(next);
      }
      menu.classList.add("hidden");
      btn.setAttribute("aria-expanded", "false");
      syncHintIfNotEdited();
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
    pill.textContent = previewLabel(syl);
    sylWrap.appendChild(pill);
  });

  $("cardHint").textContent = (state.hint || "").trim();
}

function renderAll() {
  if (state.mode === "single") {
    renderSyllableEditor();
    renderPreview();

    const disabled = !state.name.trim();
    $("saveBtn").disabled = disabled;
    $("copyBtn").disabled = disabled;
    $("copyHtmlBtn").disabled = disabled;
    $("resetBtn").disabled = disabled;
  }

  // list mode renders independently
}

/* ─── Single-mode actions ───────────────────────────────────────────────── */
$("addSyllableBtn").addEventListener("click", () => {
  if (!state.name.trim()) {
    toast("Type a name first");
    $("nameInput").focus();
    return;
  }
  const v = prompt("New syllable label:", "NEW");
  if (!v || !v.trim()) return;

  const next = v.trim().toUpperCase();
  state.syllables.push({
    selectedUpper: next,
    optionsUpper: [next]
  });

  state.baseline = {
    syllables: deepCopySyllables(state.syllables),
    hint: autoHint(state.name, state.syllables)
  };

  syncHintIfNotEdited();
  renderAll();
});

$("hintInput").addEventListener("input", () => {
  const v = $("hintInput").value || "";
  if (!state.userEditedHint) state.userEditedHint = true;
  state.hint = v;
  renderPreview();
});

document.querySelectorAll(".example-chip").forEach((b) => {
  b.addEventListener("click", () => {
    const nm = b.getAttribute("data-name") || "";
    $("nameInput").value = nm;
    state.userEditedHint = false;
    analyzeName();
    $("nameInput").focus();
  });
});

let t = null;
$("nameInput").addEventListener("input", () => {
  window.clearTimeout(t);
  t = window.setTimeout(() => {
    state.userEditedHint = false;
    analyzeName();
  }, 180);
});

async function copyTextSingle() {
  if (!state.name.trim()) return;
  const plain = `${state.name}\n${state.syllables.map(previewLabel).join(" · ")}${(state.hint || "").trim() ? `\n\n${(state.hint || "").trim()}` : ""}`;
  try {
    await navigator.clipboard.writeText(plain);
    toast("Copied");
  } catch {
    toast("Couldn’t copy (browser blocked).");
  }
}

function buildInlineSnippet(name, syllables, hint) {
  const safeName = escapeHTML(name || "");
  const safeHint = escapeHTML((hint || "").trim());
  const pills = (syllables || []).map(s => `<span style="display:inline-block;background:#1a97aa;color:rgba(255,255,255,.95);border-radius:999px;padding:10px 16px;font-weight:800;font-size:16px;letter-spacing:.2px;min-width:68px;text-align:center;margin:6px 8px 0 0;">${escapeHTML(s)}</span>`).join("");
  return `
<div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:680px;background:#0b2f3f;border-radius:28px;padding:18px 18px 14px;text-align:center;">
  <div style="font-size:28px;font-weight:500;color:rgba(255,255,255,.95);">${safeName}</div>
  <div style="margin-top:10px;">${pills}</div>
  ${safeHint ? `<div style="margin-top:12px;font-size:16px;color:rgba(255,255,255,.9);">${safeHint}</div>` : ""}
  <div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.62);">How to say my name</div>
</div>`.trim();
}

async function copyHtmlSingle() {
  if (!state.name.trim()) return;
  const html = buildInlineSnippet(
    state.name,
    state.syllables.map(previewLabel),
    (state.hint || "").trim()
  );
  try {
    await navigator.clipboard.writeText(html);
    toast("HTML copied");
  } catch {
    toast("Couldn’t copy HTML (browser blocked).");
  }
}

$("copyBtn").addEventListener("click", copyTextSingle);
$("copyHtmlBtn").addEventListener("click", copyHtmlSingle);

$("resetBtn").addEventListener("click", () => {
  if (!state.baseline) return;
  state.syllables = deepCopySyllables(state.baseline.syllables);
  state.userEditedHint = false;
  state.hint = state.baseline.hint || "";
  $("hintInput").value = state.hint;
  renderAll();
  toast("Reset");
});

function buildCardPageHTML(name, syllables, hint) {
  const safeName = escapeHTML(name || "");
  const safeHint = escapeHTML((hint || "").trim());
  const pillHtml = (syllables || []).map(s => `<div class="pill">${escapeHTML(s)}</div>`).join("");

  const css = `
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#ffffff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
  .card{width:min(720px,92vw);background:#0b2f3f;border-radius:34px;padding:26px 22px 22px;box-shadow:0 14px 30px rgba(0,0,0,.14);text-align:center;}
  .name{font-size:36px;font-weight:500;color:rgba(255,255,255,.95);}
  .pills{margin-top:18px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap;}
  .pill{background:#1a97aa;color:rgba(255,255,255,.95);border-radius:999px;padding:12px 22px;font-weight:800;font-size:18px;letter-spacing:.4px;min-width:92px;}
  .hint{margin-top:18px;font-size:18px;color:rgba(255,255,255,.9);}
  .foot{margin-top:10px;font-size:12px;color:rgba(255,255,255,.62);}
  `.trim();

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
<body>
  <div class="card">
    <div class="name">${safeName}</div>
    <div class="pills">${pillHtml}</div>
    ${safeHint ? `<div class="hint">${safeHint}</div>` : ""}
    <div class="foot">How to say my name</div>
  </div>
</body>
</html>`;
}

$("saveBtn").addEventListener("click", async () => {
  if (!state.name.trim()) {
    toast("Add a name first");
    $("nameInput").focus();
    return;
  }

  const html = buildCardPageHTML(
    state.name,
    state.syllables.map(previewLabel),
    (state.hint || "").trim()
  );

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

  await copyTextSingle();
});

/* ─── Class-list mode ───────────────────────────────────────────────────── */
function parseNames(text) {
  return (text || "")
    .split(/\r?\n/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}

function generateList() {
  const names = parseNames($("listInput").value || "");
  if (!names.length) {
    toast("Paste at least one name");
    return;
  }

  // preserve order, remove exact duplicates
  const seen = new Set();
  const unique = [];
  for (const n of names) {
    const key = n.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(n);
  }

  state.list = unique.map((nm) => {
    const res = generateSyllableCandidates(nm);
    const syllUpper = (res.syllables || []).map(s => (s.baseUpper || "").toUpperCase()).filter(Boolean);
    const hint = autoHint(nm, (res.syllables || []).map(s => ({ selectedUpper: (s.baseUpper || "").toUpperCase() })));
    return {
      name: nm,
      syllablesLower: syllUpper.map(s => s.toLowerCase()),
      hint
    };
  });

  renderListResults();
  renderListPreviewGrid();
  toast(`Generated ${state.list.length} names`);
}

function renderListResults() {
  const wrap = $("listResults");
  wrap.innerHTML = "";

  state.list.forEach((item) => {
    const row = document.createElement("div");
    row.className = "list-item";

    const top = document.createElement("div");
    top.className = "list-item-top";

    const nm = document.createElement("div");
    nm.className = "list-name";
    nm.textContent = item.name;

    const actions = document.createElement("div");
    actions.className = "list-mini-actions";

    const copy = document.createElement("button");
    copy.className = "list-mini";
    copy.type = "button";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      const plain = `${item.name}\n${item.syllablesLower.join(" · ")}${item.hint ? `\n\n${item.hint}` : ""}`;
      try {
        await navigator.clipboard.writeText(plain);
        toast("Copied");
      } catch {
        toast("Couldn’t copy (browser blocked).");
      }
    });

    const edit = document.createElement("button");
    edit.className = "list-mini";
    edit.type = "button";
    edit.textContent = "Open";
    edit.addEventListener("click", () => {
      // Move into single mode for refinement
      $("nameInput").value = item.name;
      state.userEditedHint = false;
      setMode("single");
      analyzeName();
    });

    actions.appendChild(copy);
    actions.appendChild(edit);

    top.appendChild(nm);
    top.appendChild(actions);

    const line = document.createElement("div");
    line.className = "list-line";
    line.innerHTML = `<span class="dots">${escapeHTML(item.syllablesLower.join(" · "))}</span>${item.hint ? ` — ${escapeHTML(item.hint)}` : ""}`;

    row.appendChild(top);
    row.appendChild(line);

    wrap.appendChild(row);
  });
}

function renderListPreviewGrid() {
  const grid = $("listCardGrid");
  grid.innerHTML = "";

  state.list.forEach((item) => {
    const card = document.createElement("div");
    card.className = "list-card";

    const nm = document.createElement("div");
    nm.className = "nm";
    nm.textContent = item.name;

    const pills = document.createElement("div");
    pills.className = "pills";
    item.syllablesLower.forEach((s) => {
      const p = document.createElement("div");
      p.className = "pill";
      p.textContent = s;
      pills.appendChild(p);
    });

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = item.hint || "";

    const foot = document.createElement("div");
    foot.className = "foot";
    foot.textContent = "How to say my name";

    card.appendChild(nm);
    card.appendChild(pills);
    if (item.hint) card.appendChild(hint);
    card.appendChild(foot);

    grid.appendChild(card);
  });
}

async function copyAllText() {
  if (!state.list.length) {
    toast("Generate a list first");
    return;
  }
  const blocks = state.list.map(item => `${item.name}\n${item.syllablesLower.join(" · ")}${item.hint ? `\n${item.hint}` : ""}`).join("\n\n");
  try {
    await navigator.clipboard.writeText(blocks);
    toast("Copied all");
  } catch {
    toast("Couldn’t copy (browser blocked).");
  }
}

function downloadAll() {
  if (!state.list.length) {
    toast("Generate a list first");
    return;
  }

  const cards = state.list.map(item => {
    const pills = item.syllablesLower.map(s => `<div class="pill">${escapeHTML(s)}</div>`).join("");
    const hint = item.hint ? `<div class="hint">${escapeHTML(item.hint)}</div>` : "";
    return `<div class="card">
      <div class="name">${escapeHTML(item.name)}</div>
      <div class="pills">${pills}</div>
      ${hint}
      <div class="foot">How to say my name</div>
    </div>`;
  }).join("");

  const css = `
  body{margin:0;background:#ffffff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
  .wrap{max-width:900px;margin:0 auto;padding:28px 16px 40px;}
  .head{text-align:center;margin-bottom:18px;}
  .title{font-size:20px;font-weight:800;color:#0b2f3f;margin:0;}
  .sub{font-size:13px;color:rgba(11,47,63,0.70);margin:6px 0 0;}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
  .card{background:#0b2f3f;border-radius:28px;padding:18px 16px 14px;text-align:center;box-shadow:0 14px 30px rgba(0,0,0,.14);}
  .name{font-size:26px;font-weight:500;color:rgba(255,255,255,.95);}
  .pills{margin-top:12px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap;}
  .pill{background:#1a97aa;color:rgba(255,255,255,.95);border-radius:999px;padding:10px 18px;font-weight:800;font-size:16px;min-width:78px;}
  .hint{margin-top:12px;font-size:14px;color:rgba(255,255,255,.88);}
  .foot{margin-top:10px;font-size:12px;color:rgba(255,255,255,.62);}
  `.trim();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>TRU Pronounce — Class list</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>
  <div class="wrap">
    <div class="head">
      <h1 class="title">Class list pronunciation cards</h1>
      <p class="sub">Starting points only — when in doubt, ask the person.</p>
    </div>
    <div class="grid">${cards}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = "class-list-pronunciation-cards.html";
  a.href = url;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  toast("Downloaded");
}

$("generateListBtn").addEventListener("click", generateList);
$("copyAllTextBtn").addEventListener("click", copyAllText);
$("downloadAllBtn").addEventListener("click", downloadAll);

// Initial
setMode("single");
setExamplesVisible(true);
renderAll();
