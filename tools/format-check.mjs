// Lightweight formatting check to avoid accidental tabs / CRLF churn in PRs.
// Not a linter; just guardrails.
import fs from "node:fs";
import path from "node:path";

const exts = new Set([".js",".html",".css",".md",".mjs",".json"]);
const root = process.cwd();

function walk(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const it of items) {
    if (it.name === ".git" || it.name === "node_modules") continue;
    const p = path.join(dir, it.name);
    if (it.isDirectory()) walk(p);
    else if (exts.has(path.extname(it.name))) {
      const s = fs.readFileSync(p, "utf8");
      if (s.includes("\t")) {
        console.error("TAB found:", p);
        process.exitCode = 1;
      }
    }
  }
}

walk(root);
if (!process.exitCode) console.log("OK: no tab characters found");
