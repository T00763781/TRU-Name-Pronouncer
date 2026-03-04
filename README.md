# TRU Name Pronouncer (Tool + Engine)

A respectful, starting-point name pronunciation helper for TRU’s Name Inclusion Project.

## What it does
- Generates a **starting-point** syllable breakdown for a name
- Each syllable is a clickable chip with **alternatives** + **Custom…**
- Provides a “common-sense” helper panel (Say / Cues / Polite ask)
- **Copy text**, **Copy HTML**, **Download card**, and **Reset** (hard reset to blank state)

## Privacy & safety posture
- Runs in the browser. Nothing is uploaded.
- The UI does **not** infer or display identity-linked attributes (no origin/language labels, no confidence scores).

## Deploy (GitHub Pages)
1. Push this repo to GitHub.
2. Settings → Pages → Deploy from branch → `main` / `/root`.
3. Your tool will be available at the Pages URL.

## Embed
Use `embed.html` for iframe embedding (minisite/CMS).

Example:
```html
<iframe src="YOUR_TOOL_URL/embed.html" title="Name pronunciation helper" loading="lazy" allow="clipboard-write"
  style="width:100%;height:860px;border:0;border-radius:18px;overflow:hidden"></iframe>
```

## Development (optional)
This repo runs without a build step. For local preview:
```bash
python -m http.server 8000
# open http://localhost:8000
```

### Optional tooling (lint/format)
See `package.json` for scripts. (These are optional and not required for GitHub Pages.)
