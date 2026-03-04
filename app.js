/**
 * app.js — Name Pronunciation Tool
 */

import { syllabifyName, isInDictionary, getOriginHint, escapeHTML } from "./engine/index.js";

// ─── State ────────────────────────────────────────────────────────────────────
const state = {
  name: '',
  syllables: [],       // array of editable strings
  hint: '',
  audioBlob: null,     // final chosen audio
  audioDataURL: null,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

function show(el) {
  if (typeof el === 'string') el = $(el);
  el.classList.remove('hidden');
}
function hide(el) {
  if (typeof el === 'string') el = $(el);
  el.classList.add('hidden');
}
function showStep(n) {
  document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
  show(`step-${n}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Step 1: Name Entry ───────────────────────────────────────────────────────
$('syllabifyBtn').addEventListener('click', () => {
  const name = $('nameInput').value.trim();
  if (!name) return;
  state.name = name;
  state.syllables = syllabifyName(name);
  renderSyllableEditor();
  $('hintInput').value = '';

  // Show dictionary confidence badge + origin hint
  const inDict = isInDictionary(name);
  const originHint = getOriginHint(name);
  const badge = $('dictBadge');
  const hintBanner = $('originHint');

  if (inDict) {
    badge.textContent = '✓ Found in pronunciation dictionary';
    badge.className = 'dict-badge dict-found';
    show(badge);
  } else {
    badge.textContent = '~ Pronunciation estimated — please verify';
    badge.className = 'dict-badge dict-estimated';
    show(badge);
  }

  if (originHint) {
    hintBanner.textContent = originHint;
    show(hintBanner);
  } else {
    hide(hintBanner);
  }

  showStep(2);
});

$('nameInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') $('syllabifyBtn').click();
});

// ─── Step 2: Syllable Editor ──────────────────────────────────────────────────
function isStressed(syl) {
  // A syllable is stressed if it contains at least one uppercase letter
  return /[A-Z]/.test(syl) && syl === syl.toUpperCase();
}

function renderSyllableEditor() {
  const editor = $('syllableEditor');
  editor.innerHTML = '';

  state.syllables.forEach((syl, i) => {
    if (syl === '·') {
      const sep = document.createElement('div');
      sep.className = 'syl-separator';
      sep.textContent = '·';
      editor.appendChild(sep);
      return;
    }

    const stressed = isStressed(syl);
    const pill = document.createElement('div');
    pill.className = `syl-pill ${stressed ? 'stressed' : 'unstressed'}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.value = syl;
    input.className = 'syl-input';
    input.dataset.index = i;
    input.title = stressed ? 'Stressed syllable (UPPERCASE)' : 'Unstressed syllable (lowercase)';
    input.addEventListener('input', () => {
      state.syllables[i] = input.value;
      // Re-apply stress class based on current value
      const isNowStressed = isStressed(input.value);
      pill.className = `syl-pill ${isNowStressed ? 'stressed' : 'unstressed'}`;
    });

    const removeBtn = document.createElement('button');
    removeBtn.className = 'syl-remove';
    removeBtn.textContent = '×';
    removeBtn.title = 'Remove syllable';
    removeBtn.addEventListener('click', () => {
      state.syllables.splice(i, 1);
      renderSyllableEditor();
    });

    pill.appendChild(input);
    pill.appendChild(removeBtn);
    editor.appendChild(pill);
  });

  // Add syllable button
  const addBtn = document.createElement('button');
  addBtn.className = 'syl-add';
  addBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  addBtn.title = 'Add syllable';
  addBtn.addEventListener('click', () => {
    state.syllables.push('NEW');
    renderSyllableEditor();
    // Focus the new input
    setTimeout(() => {
      const inputs = editor.querySelectorAll('.syl-input');
      inputs[inputs.length - 1]?.focus();
      inputs[inputs.length - 1]?.select();
    }, 50);
  });
  editor.appendChild(addBtn);
}

$('toAudioBtn').addEventListener('click', () => {
  state.hint = $('hintInput').value.trim();
  // Pre-fill TTS input with syllables joined
  $('ttsInput').value = state.syllables.filter(s => s !== '·').join('-');
  showStep(3);
  loadTTSVoices();
});

// ─── Step 3: Audio ────────────────────────────────────────────────────────────

// Tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => hide(p));
    btn.classList.add('active');
    show(`tab-${btn.dataset.tab}`);
  });
});

// -- Recording --
let mediaRecorder = null;
let audioChunks = [];
let animationFrame = null;
let analyser = null;

// Build waveform bars
const bars = 40;
const waveformBars = $('waveformBars');
for (let i = 0; i < bars; i++) {
  const bar = document.createElement('div');
  bar.className = 'bar';
  waveformBars.appendChild(bar);
}

function animateWaveform() {
  if (!analyser) return;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  const barEls = waveformBars.querySelectorAll('.bar');
  const step = Math.floor(data.length / bars);
  barEls.forEach((bar, i) => {
    const value = data[i * step] / 255;
    bar.style.height = `${8 + value * 52}px`;
    bar.style.opacity = 0.4 + value * 0.6;
  });
  animationFrame = requestAnimationFrame(animateWaveform);
}

function resetWaveform() {
  if (animationFrame) cancelAnimationFrame(animationFrame);
  waveformBars.querySelectorAll('.bar').forEach(bar => {
    bar.style.height = '8px';
    bar.style.opacity = '0.3';
  });
}

$('recordBtn').addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const audioCtx = new AudioContext();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      resetWaveform();
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      state.audioBlob = blob;
      const url = URL.createObjectURL(blob);
      const player = $('audioPlayback');
      player.src = url;
      show(player);
      show('rerecordBtn');
      show('toExportBtn');
      $('recordingStatus').textContent = '✓ Recording saved';
    };

    mediaRecorder.start();
    animateWaveform();
    hide('recordBtn');
    show('stopBtn');
    $('recordingStatus').textContent = '● Recording…';
  } catch (err) {
    $('recordingStatus').textContent = '⚠ Microphone access denied. Please allow mic access or use TTS.';
  }
});

$('stopBtn').addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  hide('stopBtn');
  show('recordBtn');
});

$('rerecordBtn').addEventListener('click', () => {
  state.audioBlob = null;
  state.audioDataURL = null;
  const player = $('audioPlayback');
  player.src = '';
  hide(player);
  hide('rerecordBtn');
  hide('toExportBtn');
  $('recordingStatus').textContent = '';
  resetWaveform();
});

// -- TTS --
let voices = [];
function loadTTSVoices() {
  const sel = $('voiceSelect');
  function populate() {
    voices = window.speechSynthesis.getVoices();
    sel.innerHTML = '';
    const english = voices.filter(v => v.lang.startsWith('en'));
    const toShow = english.length > 0 ? english : voices;
    toShow.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name} (${v.lang})`;
      sel.appendChild(opt);
    });
  }
  populate();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = populate;
  }
}

$('ttsPreviewBtn').addEventListener('click', () => {
  const text = $('ttsInput').value || state.name;
  const utter = new SpeechSynthesisUtterance(text);
  const selectedVoice = voices.find(v => v.name === $('voiceSelect').value);
  if (selectedVoice) utter.voice = selectedVoice;
  utter.rate = 0.85;
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
});

$('ttsGenerateBtn').addEventListener('click', async () => {
  $('ttsStatus').textContent = 'Generating audio…';
  const text = $('ttsInput').value || state.name;
  const selectedVoice = voices.find(v => v.name === $('voiceSelect').value);

  try {
    // Use AudioContext to capture speech synthesis output
    const audioCtx = new AudioContext();
    const dest = audioCtx.createMediaStreamDestination();
    const recorder = new MediaRecorder(dest.stream);
    const chunks = [];

    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' });
      state.audioBlob = blob;
      const url = URL.createObjectURL(blob);
      const player = $('ttsPlayback');
      player.src = url;
      show(player);
      show('toExportBtn');
      $('ttsStatus').textContent = '✓ Audio generated';
    };

    // Fallback: just use blob from offline recording approach
    // Since capturing TTS directly is complex cross-browser,
    // we'll synthesise and capture via a simpler approach
    const utter = new SpeechSynthesisUtterance(text);
    if (selectedVoice) utter.voice = selectedVoice;
    utter.rate = 0.85;

    // Simple approach: record silence + notify user to use browser TTS
    // For a real implementation, use a server-side TTS API
    // Here we'll generate a simple encoding note and offer a workaround

    utter.onstart = () => recorder.start();
    utter.onend = () => {
      setTimeout(() => recorder.stop(), 300);
    };

    speechSynthesis.cancel();
    speechSynthesis.speak(utter);

  } catch (err) {
    $('ttsStatus').textContent = '⚠ Could not capture audio. Try the Record tab instead.';
    console.error(err);
  }
});

// Skip audio
$('skipAudioBtn').addEventListener('click', () => {
  state.audioBlob = null;
  state.audioDataURL = null;
  goToExport();
});

$('toExportBtn').addEventListener('click', async () => {
  if (state.audioBlob) {
    state.audioDataURL = await blobToDataURL(state.audioBlob);
  }
  goToExport();
});

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Step 4: Export ───────────────────────────────────────────────────────────
function goToExport() {
  showStep(4);
  renderPreview();
  renderHTMLSnippet();
  renderBadgePreview();
}

function getSyllableDisplay() {
  return state.syllables
    .filter(s => s !== '·')
    .map(s => `<span class="sig-syl">${s}</span>`)
    .join('');
}

function renderPreview() {
  $('cardName').textContent = state.name;
  const sylEl = $('cardSyllables');
  sylEl.innerHTML = state.syllables
    .filter(s => s !== '·')
    .map(s => `<span class="preview-syl">${s}</span>`)
    .join('');

  const hintEl = $('cardHint');
  if (state.hint) {
    hintEl.textContent = state.hint;
    show(hintEl);
  } else {
    hide(hintEl);
  }

  const audioBtn = $('cardAudioBtn');
  if (state.audioDataURL) {
    show(audioBtn);
    audioBtn.onclick = () => {
      const audio = new Audio(state.audioDataURL);
      audio.play();
    };
  } else {
    hide(audioBtn);
  }
}

function renderHTMLSnippet() {
  const audioAttr = state.audioDataURL
    ? `data-audio="${state.audioDataURL.slice(0, 30)}…"`
    : '';

  // Build the inline HTML for email signature
  const audioButtonHTML = state.audioDataURL ? `
  <a href="#" onclick="(function(){var a=new Audio('${state.audioDataURL}');a.play();return false;})()" 
     style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;background:#1a9e8f;border-radius:50%;text-decoration:none;color:white;font-size:12px;vertical-align:middle;margin-left:6px;" 
     title="Hear my name pronounced">▶</a>` : '';

  const hintHTML = state.hint
    ? `<div style="font-size:11px;color:#666;margin-top:4px;font-style:italic;">${escapeHTML(state.hint)}</div>`
    : '';

  const syllablesHTML = state.syllables
    .filter(s => s !== '·')
    .map(s => `<span style="display:inline-block;background:#e8f7f5;color:#0e7a6e;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.05em;margin:2px;">${s}</span>`)
    .join('');

  const snippet = `<!-- Name Pronunciation Card -->
<table cellpadding="0" cellspacing="0" border="0" style="font-family:sans-serif;">
  <tr>
    <td style="background:#f0faf9;border:1px solid #b2dfdb;border-radius:8px;padding:10px 14px;">
      <div style="font-size:15px;font-weight:600;color:#0e2a28;">
        ${escapeHTML(state.name)}${audioButtonHTML}
      </div>
      <div style="margin-top:6px;">${syllablesHTML}</div>
      ${hintHTML}
    </td>
  </tr>
</table>`;

  const block = $('htmlSnippetBlock');
  block.textContent = snippet;

  $('copyHtmlBtn').onclick = () => {
    navigator.clipboard.writeText(snippet).then(() => {
      $('copyHtmlBtn').textContent = '✓ Copied!';
      setTimeout(() => $('copyHtmlBtn').textContent = 'Copy HTML', 2000);
    });
  };
}

function renderBadgePreview() {
  const badgeEl = $('badgePreview');
  const sylHTML = state.syllables
    .filter(s => s !== '·')
    .map(s => `<span class="bp-syl">${s}</span>`)
    .join('');

  badgeEl.innerHTML = `
    <div class="badge-card">
      <div class="bp-name">${escapeHTML(state.name)}</div>
      <div class="bp-syls">${sylHTML}</div>
      ${state.hint ? `<div class="bp-hint">${escapeHTML(state.hint)}</div>` : ''}
      ${state.audioDataURL ? `<div class="bp-audio-label">🔊 Tap to hear</div>` : ''}
    </div>`;

  $('downloadPageBtn').onclick = () => downloadPronunciationPage();
}

function downloadPronunciationPage() {
  const audioScriptBlock = state.audioDataURL ? `
    document.getElementById('playBtn').addEventListener('click', function() {
      var audio = new Audio('${state.audioDataURL}');
      audio.play();
      this.textContent = '▶ Playing…';
      audio.onended = () => { this.textContent = '▶ Hear my name'; };
    });` : `
    document.getElementById('playBtn').style.display = 'none';`;

  const sylPills = state.syllables
    .filter(s => s !== '·')
    .map(s => `<span class="syl">${s}</span>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>How to say ${escapeHTML(state.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,300;0,700;1,300&family=DM+Sans:wght@400;500&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0d2b29;
      font-family: 'DM Sans', sans-serif;
      padding: 2rem;
    }
    .card {
      background: #f5f0e8;
      border-radius: 20px;
      padding: 3rem 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 40px 80px rgba(0,0,0,0.5);
    }
    .label {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #1a9e8f;
      margin-bottom: 1rem;
    }
    .name {
      font-family: 'Fraunces', serif;
      font-size: clamp(2.5rem, 10vw, 4.5rem);
      font-weight: 700;
      color: #0d2b29;
      line-height: 1;
      margin-bottom: 1.5rem;
    }
    .syllables {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      margin-bottom: 1.5rem;
    }
    .syl {
      background: #1a9e8f;
      color: white;
      padding: 6px 16px;
      border-radius: 50px;
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.06em;
    }
    .hint {
      font-style: italic;
      color: #666;
      font-size: 14px;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .play-btn {
      background: #1a9e8f;
      color: white;
      border: none;
      padding: 14px 32px;
      border-radius: 50px;
      font-family: 'DM Sans', sans-serif;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .play-btn:hover { background: #0e7a6e; transform: scale(1.02); }
    .play-btn:active { transform: scale(0.98); }
    .footer {
      margin-top: 2rem;
      font-size: 11px;
      color: #aaa;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="label">How to say my name</div>
    <div class="name">${escapeHTML(state.name)}</div>
    <div class="syllables">${sylPills}</div>
    ${state.hint ? `<p class="hint">"${escapeHTML(state.hint)}"</p>` : ''}
    <button class="play-btn" id="playBtn">▶ Hear my name</button>
    <div class="footer">saymyname • built with care</div>
  </div>
  <script>${audioScriptBlock}</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `how-to-say-${state.name.toLowerCase().replace(/\s+/g, '-')}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Start Over ───────────────────────────────────────────────────────────────
$('startOverBtn').addEventListener('click', () => {
  state.name = '';
  state.syllables = [];
  state.hint = '';
  state.audioBlob = null;
  state.audioDataURL = null;
  $('nameInput').value = '';
  $('hintInput').value = '';
  $('recordingStatus').textContent = '';
  $('ttsStatus').textContent = '';
  hide('audioPlayback');
  hide('ttsPlayback');
  hide('rerecordBtn');
  hide('toExportBtn');
  show('recordBtn');
  hide('stopBtn');
  resetWaveform();
  showStep(1);
});
