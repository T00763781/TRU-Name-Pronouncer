import * as genericLatin from "./languages/genericLatin.js";
import * as spanish from "./languages/spanish.js";
import * as polish from "./languages/polish.js";
import * as pinyin from "./languages/pinyin.js";
import * as vietnamese from "./languages/vietnamese.js";
import * as japanese from "./languages/japanese.js";

export function getLanguageModule(lang) {
  const l = (lang || "en").toLowerCase();
  if (l === "es") return spanish;
  if (l === "pl") return polish;
  if (l === "vi") return vietnamese;
  if (l === "zh_pinyin") return pinyin;
  if (l === "ja") return japanese;
  // default fallback
  return genericLatin;
}
