  import { generateSyllableCandidates, escapeHTML, titleCaseName, buildExplainer } from "./engine/index.js";

  const state = {
    name: "",
    syllables: [],        // [{ selectedUpper, optionsUpper }]
    hint: "",
    userEditedHint: false,
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

  function setExamplesVisible(on) {
    const ex = $("examples");
    if (!ex) return;
    ex.style.display = on ? "flex" : "none";
  }

  function previewLabel(syl) {
    return (syl?.selectedUpper || "").toLowerCase();
  }

  function renderChips() {
    const wrap = $("syllableEditor");
    wrap.innerHTML = "";

    state.syllables.forEach((syl, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = (syl.selectedUpper || "").toUpperCase();
      btn.setAttribute("aria-haspopup", "menu");
      btn.setAttribute("aria-expanded", "false");

      const menu = document.createElement("div");
      menu.className = "menu hidden";
      menu.setAttribute("role", "menu");

      const opts = (syl.optionsUpper || []).slice(0, 12);
      for (const opt of opts) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "menu-btn";
        item.textContent = opt;
        item.setAttribute("role", "menuitem");
        if (opt.toUpperCase() === syl.selectedUpper.toUpperCase()) {
          item.setAttribute("aria-current", "true");
        }
        item.addEventListener("click", () => {
          syl.selectedUpper = opt.toUpperCase();
          menu.classList.add("hidden");
          btn.setAttribute("aria-expanded", "false");
          syncExplainer();
          renderPreview();
          renderChips();
        });
        menu.appendChild(item);
      }

      const sep = document.createElement("div");
      sep.className = "menu-sep";
      menu.appendChild(sep);

      const custom = document.createElement("button");
      custom.type = "button";
      custom.className = "menu-btn";
      custom.textContent = "Custom…";
      custom.setAttribute("role", "menuitem");
      custom.addEventListener("click", () => {
        const v = prompt("Custom syllable label (e.g., DAY, DEH, TREE):", syl.selectedUpper);
        if (v && v.trim()) {
          const next = v.trim().toUpperCase();
          syl.selectedUpper = next;
          if (!syl.optionsUpper.includes(next)) syl.optionsUpper.unshift(next);
        }
        menu.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
        syncExplainer();
        renderPreview();
        renderChips();
      });
      menu.appendChild(custom);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "menu-btn";
      remove.textContent = "Remove syllable";
      remove.setAttribute("role", "menuitem");
      remove.addEventListener("click", () => {
        state.syllables.splice(idx, 1);
        menu.classList.add("hidden");
        btn.setAttribute("aria-expanded", "false");
        syncExplainer();
        renderPreview();
        renderChips();
      });
      menu.appendChild(remove);

      btn.appendChild(menu);

      function toggle(open) {
        const isOpen = !menu.classList.contains("hidden");
        const next = typeof open === "boolean" ? open : !isOpen;
        closeAllMenus();
        if (next) {
          menu.classList.remove("hidden");
          btn.setAttribute("aria-expanded", "true");
          const first = menu.querySelector(".menu-btn");
          first?.focus();
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
    $("cardName").textContent = state.name;
    const wrap = $("cardSyllables");
    wrap.innerHTML = "";
    for (const s of state.syllables) {
      const pill = document.createElement("div");
      pill.className = "preview-chip";
      pill.textContent = previewLabel(s);
      wrap.appendChild(pill);
    }
    $("cardHint").textContent = (state.hint || "").trim();
  }

  function syncExplainer() {
    const labels = state.syllables.map(s => previewLabel(s)).filter(Boolean);
    const exp = buildExplainer(state.name, labels);
    $("helperOne").textContent = exp.oneLine;
    $("helperCues").textContent = exp.cuesLine;
    $("helperScript").textContent = exp.scriptLine;

    if (!state.userEditedHint) {
      // Default to the most useful one-liner as the user-editable hint.
      state.hint = exp.oneLine ? exp.oneLine.replace(/^Say:\s*/i, "Try: ") : "";
      $("hintInput").value = state.hint;
    }
  }

  function analyzeName() {
    const raw = $("nameInput").value || "";
    const name = raw.trim();
    state.name = titleCaseName(name);
    setExamplesVisible(!state.name);

    if (!state.name) {
      state.syllables = [];
      state.hint = "";
      state.userEditedHint = false;
      $("hintInput").value = "";
      $("helperOne").textContent = "";
      $("helperCues").textContent = "";
      $("helperScript").textContent = "";
      renderChips();
      renderPreview();
      setButtonsEnabled(false);
      return;
    }

    const res = generateSyllableCandidates(state.name);
    state.syllables = (res.syllables || []).map(s => ({
      selectedUpper: (s.baseUpper || "").toUpperCase(),
      optionsUpper: (s.optionsUpper || []).map(x => (x || "").toUpperCase())
    }));

    syncExplainer();
    renderChips();
    renderPreview();
    setButtonsEnabled(true);
  }

  function setButtonsEnabled(on) {
    ["copyTextBtn","copyHtmlBtn","downloadBtn","resetBtn"].forEach(id => {
      const el = $(id);
      if (el) el.disabled = !on;
    });
  }

  // Hard reset: return to original blank state (fresh page).
  function hardReset() {
    state.name = "";
    state.syllables = [];
    state.hint = "";
    state.userEditedHint = false;

    $("nameInput").value = "";
    $("hintInput").value = "";
    $("helperOne").textContent = "";
    $("helperCues").textContent = "";
    $("helperScript").textContent = "";
    $("cardName").textContent = "";
    $("cardSyllables").innerHTML = "";
    $("cardHint").textContent = "";

    setExamplesVisible(true);
    renderChips();
    setButtonsEnabled(false);
    $("nameInput").focus();
    toast("Reset");
  }

  // Copy text
  async function copyText() {
    const plain = `${state.name}\n${state.syllables.map(previewLabel).join(" · ")}${state.hint.trim() ? `\n\n${state.hint.trim()}` : ""}`;
    try {
      await navigator.clipboard.writeText(plain);
      toast("Copied");
    } catch {
      toast("Couldn’t copy (browser blocked).");
    }
  }

  // Copy HTML snippet (paste into LMS/email)
  async function copyHtml() {
    const safeName = escapeHTML(state.name);
    const pills = state.syllables.map(s => previewLabel(s)).map(s =>
      `<span style="display:inline-block;background:#00b0b9;color:#fff;border-radius:999px;padding:10px 16px;font-weight:900;font-size:16px;min-width:68px;text-align:center;margin:6px 8px 0 0;">${escapeHTML(s)}</span>`
    ).join("");

    const safeHint = escapeHTML(state.hint.trim());

    const html = `
<div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:720px;background:#003e51;border-radius:28px;padding:18px 18px 14px;text-align:center;">
  <div style="font-size:28px;font-weight:600;color:#fff;">${safeName}</div>
  <div style="margin-top:10px;">${pills}</div>
  ${safeHint ? `<div style="margin-top:12px;font-size:16px;color:rgba(255,255,255,.92);">${safeHint}</div>` : ""}
  <div style="margin-top:10px;font-size:12px;color:rgba(255,255,255,.70);">How to say my name</div>
</div>`.trim();

    try {
      await navigator.clipboard.writeText(html);
      toast("HTML copied");
    } catch {
      toast("Couldn’t copy HTML (browser blocked).");
    }
  }

  function buildCardPage() {
    const safeName = escapeHTML(state.name);
    const safeHint = escapeHTML(state.hint.trim());
    const pills = state.syllables.map(s => previewLabel(s)).map(s => `<div class="pill">${escapeHTML(s)}</div>`).join("");

    const css = `
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#fff;font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;}
    .card{width:min(820px,92vw);background:#003e51;border-radius:34px;padding:26px 22px 22px;box-shadow:0 14px 30px rgba(0,0,0,.14);text-align:center;}
    .name{font-size:36px;font-weight:600;color:#fff;}
    .pills{margin-top:18px;display:flex;gap:18px;justify-content:center;flex-wrap:wrap;}
    .pill{background:#00b0b9;color:#fff;border-radius:999px;padding:12px 22px;font-weight:900;font-size:18px;min-width:92px;}
    .hint{margin-top:18px;font-size:18px;color:rgba(255,255,255,.92);}
    .foot{margin-top:10px;font-size:12px;color:rgba(255,255,255,.70);}
    `.trim();

    const inner = `
      <div class="card">
        <div class="name">${safeName}</div>
        <div class="pills">${pills}</div>
        ${safeHint ? `<div class="hint">${safeHint}</div>` : ""}
        <div class="foot">How to say my name</div>
      </div>
    `.trim();

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeName} — Pronunciation</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>${css}</style>
</head>
<body>${inner}</body>
</html>`;
  }

  async function downloadCard() {
    const html = buildCardPage();
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
  }

  // Events
  let deb = null;
  $("nameInput").addEventListener("input", () => {
    window.clearTimeout(deb);
    deb = window.setTimeout(() => {
      state.userEditedHint = false;
      analyzeName();
    }, 160);
  });

  $("nameInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      analyzeName();
    }
  });

  $("hintInput").addEventListener("input", () => {
    state.userEditedHint = true;
    state.hint = $("hintInput").value || "";
    renderPreview();
  });

  $("addSyllableBtn").addEventListener("click", () => {
    if (!state.name) return toast("Type a name first");
    const v = prompt("New syllable label:", "NEW");
    if (!v || !v.trim()) return;
    const next = v.trim().toUpperCase();
    state.syllables.push({ selectedUpper: next, optionsUpper: [next] });
    syncExplainer();
    renderChips();
    renderPreview();
  });

  $("copyTextBtn").addEventListener("click", copyText);
  $("copyHtmlBtn").addEventListener("click", copyHtml);
  $("downloadBtn").addEventListener("click", downloadCard);
  $("resetBtn").addEventListener("click", hardReset);

  document.querySelectorAll(".example-chip").forEach((b) => {
    b.addEventListener("click", () => {
      $("nameInput").value = b.getAttribute("data-name") || "";
      state.userEditedHint = false;
      analyzeName();
      $("nameInput").focus();
    });
  });

  // Init
  hardReset();
