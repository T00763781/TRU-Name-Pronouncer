/**
 * syllables.js — Enhanced Name Pronunciation Engine v2
 *
 * Three-tier system:
 *   1. Dictionary lookup  — curated first-names with correct stress
 *   2. Digraph-aware heuristics — smarter letter grouping + stress inference
 *   3. Language origin detection — adjusts rules for non-English names
 *
 * Syllable encoding:
 *   UPPERCASE = primary stress  (e.g. "DAY")
 *   lowercase = unstressed      (e.g. "ah")
 */

// ─── Tier 1: Curated Name Dictionary ─────────────────────────────────────────
const NAME_DICT = {"aaron":["AIR","on"],"aaliyah":["ah","LEE","ah"],"abigail":["AB","ih","gayl"],"adam":["AD","um"],"adele":["ah","DEL"],"ahmed":["AH","med"],"aidan":["AY","den"],"aigerim":["eye","GER","im"],"aiko":["EYE","ko"],"ainsley":["AYNZ","lee"],"aisha":["ah","EE","sha"],"alex":["AL","ex"],"alexa":["ah","LEX","ah"],"alexander":["al","ex","AN","der"],"alexis":["ah","LEX","is"],"alice":["AL","is"],"alicia":["ah","LEE","sha"],"alina":["ah","LEE","nah"],"aliya":["ah","LEE","ah"],"aliyah":["ah","LEE","ah"],"allison":["AL","ih","sun"],"alondra":["ah","LON","dra"],"alyssa":["ah","LIS","ah"],"amanda":["ah","MAN","da"],"amara":["ah","MAR","ah"],"amber":["AM","ber"],"amelia":["ah","MEE","lee","ah"],"amira":["ah","MEER","ah"],"amy":["AY","mee"],"ana":["AH","na"],"ananya":["ah","NUN","ya"],"andrea":["AN","dree","ah"],"andrew":["AN","droo"],"angel":["AYN","jel"],"angela":["AN","jeh","la"],"anika":["AH","nih","ka"],"anita":["ah","NEE","ta"],"anna":["AN","ah"],"anne":["AN"],"anthony":["AN","tho","nee"],"aria":["AIR","ee","ah"],"ariana":["air","ee","AN","ah"],"arjun":["AR","jun"],"ashley":["ASH","lee"],"astrid":["AS","trid"],"aurora":["ah","ROR","ah"],"austin":["AW","stin"],"ava":["AY","va"],"axel":["AX","el"],"ayasha":["eye","AH","sha"],"ayesha":["eye","EE","sha"],"beatrice":["BEE","ah","tris"],"bella":["BEL","ah"],"ben":["BEN"],"benjamin":["BEN","jah","min"],"bethany":["BETH","ah","nee"],"blake":["BLAYK"],"brandon":["BRAN","don"],"brianna":["bree","AN","ah"],"brittany":["BRIT","ah","nee"],"brooke":["BROOK"],"brooklyn":["BROOK","lin"],"caleb":["KAY","leb"],"cameron":["KAM","er","on"],"camila":["ka","MEE","la"],"carlos":["KAR","los"],"caroline":["KAIR","oh","line"],"carter":["KAR","ter"],"cassandra":["ka","SAN","dra"],"catherine":["KATH","er","in"],"charles":["CHARLZ"],"charlotte":["SHAR","lot"],"chelsea":["CHEL","see"],"chen":["CHEN"],"chloe":["KLO","ee"],"christian":["KRIS","chun"],"christina":["kris","TEE","nah"],"claire":["KLAIR"],"cole":["KOL"],"colin":["KOL","in"],"conor":["KON","er"],"courtney":["KORT","nee"],"daniel":["DAN","yel"],"danielle":["dan","YEL"],"david":["DAY","vid"],"deiveek":["DAY","veek"],"deivek":["DAY","vek"],"diana":["dee","AN","ah"],"diego":["dee","AY","go"],"dominic":["DOM","ih","nik"],"dylan":["DIL","an"],"elena":["eh","LAY","nah"],"elijah":["ee","LY","jah"],"elisa":["eh","LEE","sa"],"elise":["eh","LEEZ"],"elizabeth":["ee","LIZ","ah","beth"],"ella":["EL","ah"],"emily":["EM","ih","lee"],"emma":["EM","ah"],"eric":["AIR","ik"],"erica":["AIR","ih","kah"],"ethan":["EE","than"],"eva":["EE","vah"],"evelyn":["EV","eh","lin"],"fatima":["FAH","tih","mah"],"fiona":["fee","OH","nah"],"francisco":["fran","SIS","ko"],"gabriel":["GAY","bree","el"],"gabriella":["gab","ree","EL","ah"],"grace":["GRAYS"],"gracie":["GRAY","see"],"grant":["GRANT"],"grayson":["GRAY","sun"],"hannah":["HAN","ah"],"harper":["HAR","per"],"harrison":["HAIR","ih","sun"],"hayden":["HAY","den"],"heather":["HETH","er"],"henry":["HEN","ree"],"hunter":["HUN","ter"],"ian":["EE","an"],"ibrahim":["IB","rah","heem"],"imani":["ih","MAH","nee"],"isabela":["iz","ah","BEL","ah"],"isabella":["iz","ah","BEL","ah"],"isadora":["iz","ah","DOR","ah"],"jack":["JAK"],"jackson":["JAK","sun"],"jacob":["JAY","kub"],"jade":["JAYD"],"james":["JAYMZ"],"jasmine":["JAZ","min"],"jason":["JAY","sun"],"javier":["hah","VYAIR"],"jayden":["JAY","den"],"jennifer":["JEN","ih","fer"],"jessica":["JES","ih","kah"],"jesus":["HAY","soos"],"john":["JON"],"jonathan":["JON","ah","than"],"jordan":["JOR","dan"],"jose":["ho","ZAY"],"joseph":["JO","sef"],"joshua":["JOSH","yoo","ah"],"julia":["JOO","lee","ah"],"julian":["JOO","lee","an"],"juniper":["JOO","nih","per"],"kai":["KY"],"kaito":["KY","to"],"karen":["KAIR","en"],"katarina":["kat","ah","REE","nah"],"katherine":["KATH","er","in"],"katie":["KAY","tee"],"kayla":["KAY","lah"],"keanu":["kee","AH","noo"],"khalid":["kah","LEED"],"kiran":["KEER","an"],"krishna":["KRISH","nah"],"kylie":["KY","lee"],"laila":["LAY","lah"],"laura":["LOR","ah"],"lauren":["LOR","en"],"layla":["LAY","lah"],"leah":["LEE","ah"],"leilani":["lay","LAH","nee"],"leo":["LEE","oh"],"leonie":["lee","OH","nee"],"liam":["LEE","am"],"lily":["LIL","ee"],"logan":["LO","gan"],"luca":["LOO","kah"],"lucas":["LOO","kas"],"lucy":["LOO","see"],"luis":["loo","EES"],"luna":["LOO","nah"],"madeleine":["MAD","eh","lin"],"madison":["MAD","ih","sun"],"mahira":["mah","HEER","ah"],"malia":["mah","LEE","ah"],"maria":["mah","REE","ah"],"mariana":["mah","ree","AH","nah"],"marie":["mah","REE"],"mateo":["mah","TAY","oh"],"matthew":["MATH","yoo"],"maya":["MY","ah"],"mia":["MEE","ah"],"michael":["MY","kel"],"miguel":["mee","GEL"],"milan":["mih","LAN"],"mila":["MEE","lah"],"mohammed":["mo","HAM","ed"],"muhammad":["mo","HAM","ed"],"morgan":["MOR","gan"],"nadia":["NAH","dee","ah"],"naomi":["nay","OH","mee"],"natalia":["nah","TAH","lee","ah"],"natalie":["NAT","ah","lee"],"nathan":["NAY","than"],"neha":["NAY","ha"],"nicholas":["NIK","oh","las"],"nicole":["nih","KOL"],"nikhil":["NIK","hil"],"noah":["NO","ah"],"nora":["NOR","ah"],"nour":["NOOR"],"oliver":["OL","ih","ver"],"olivia":["oh","LIV","ee","ah"],"omar":["oh","MAR"],"oscar":["OS","kar"],"paige":["PAYJ"],"patrick":["PAT","rik"],"paul":["PAWL"],"penelope":["peh","NEL","oh","pee"],"peter":["PEE","ter"],"priya":["PREE","yah"],"rachel":["RAY","chel"],"rafael":["raf","ay","EL"],"raja":["RAH","jah"],"rania":["RAH","nee","ah"],"reagan":["RAY","gan"],"rebecca":["reh","BEK","ah"],"riley":["RY","lee"],"robert":["ROB","ert"],"ruby":["ROO","bee"],"ryan":["RY","an"],"sahil":["SAH","hil"],"samantha":["sa","MAN","tha"],"samuel":["SAM","yoo","el"],"santiago":["san","tee","AH","go"],"sara":["SAIR","ah"],"sarah":["SAIR","ah"],"savannah":["sa","VAN","ah"],"scarlett":["SKAR","let"],"sebastian":["se","BAS","chun"],"seun":["SHAWN"],"shirin":["shih","REEN"],"sienna":["see","EN","ah"],"siobhan":["shih","VAWN"],"sofia":["so","FEE","ah"],"sophia":["so","FEE","ah"],"sophie":["SO","fee"],"stella":["STEL","ah"],"summer":["SUM","er"],"talia":["TAL","ee","ah"],"taylor":["TAY","ler"],"thomas":["TOM","as"],"tiffany":["TIF","ah","nee"],"timothy":["TIM","oh","thee"],"tyler":["TY","ler"],"valentina":["val","en","TEE","nah"],"vanessa":["vah","NES","ah"],"victoria":["vik","TOR","ee","ah"],"violet":["VY","oh","let"],"vivian":["VIV","ee","an"],"william":["WIL","yam"],"willow":["WIL","oh"],"xavier":["ZAY","vee","er"],"xin":["SHIN"],"yasmin":["YAZ","min"],"yi":["YEE"],"yuna":["YOO","nah"],"zara":["ZAR","ah"],"zoe":["ZO","ee"],"zoey":["ZO","ee"],"zuri":["ZOO","ree"]};

// ─── Tokenizer ────────────────────────────────────────────────────────────────
// Converts a word string into an array of phonetic tokens,
// grouping digraphs and trigraphs so they count as single units.

const VOWEL_DIGRAPHS = new Set(['oo','ee','ea','oa','ou','oe','ue','ui','ai','au','aw','ay','ei','eu','ew','ey','ie','oi','oy','eau','ieu']);
const CONSONANT_DIGRAPHS = new Set(['ch','sh','th','ph','wh','gh','ng','ck','qu','tch','dge']);
const ALL_DIGRAPHS = [
  // Trigraphs first (greedy)
  'tch','dge','eau','ieu',
  // Vowel digraphs
  'oo','ee','ea','oa','ou','oe','ue','ui','ai','au','aw','ay','ei','eu','ew','ey','ie','oi','oy',
  // Consonant digraphs
  'ch','sh','th','ph','wh','gh','ng','ck','qu',
];

const SIMPLE_VOWELS = new Set(['a','e','i','o','u']);

function isVowelChar(ch) { return SIMPLE_VOWELS.has(ch); }

/**
 * Determine if 'y' at position i in string s is acting as a vowel.
 * 'y' is a vowel when:
 *   - it's at the end of a word (e.g. "Emily")
 *   - it follows a consonant and is NOT immediately before a vowel (e.g. "Lydia" → 'y' is vowel)
 *   - exception: 'y' between two vowels acts as consonant (e.g. "Priya" → 'y' is consonant)
 */
function yIsVowel(s, i) {
  const prev = i > 0 ? s[i-1] : null;
  const next = i < s.length-1 ? s[i+1] : null;
  // 'y' at end of word: vowel (e.g. Emily, Ashley)
  if (!next) return true;
  // 'y' before a vowel: consonant (e.g. Priya, Yuna, beyond)
  if (next && SIMPLE_VOWELS.has(next)) return false;
  // 'y' after a vowel: consonant (ey is a digraph handled separately)
  if (prev && SIMPLE_VOWELS.has(prev)) return false;
  // Otherwise: vowel (e.g. Lynn, Lydia middle)
  return true;
}

function tokenize(word) {
  const lower = word.toLowerCase();
  const tokens = [];
  let i = 0;
  while (i < lower.length) {
    let matched = false;
    for (const d of ALL_DIGRAPHS) {
      if (lower.startsWith(d, i)) {
        tokens.push({
          chars: word.slice(i, i + d.length),
          isVowel: VOWEL_DIGRAPHS.has(d),
          isCons: CONSONANT_DIGRAPHS.has(d),
          multi: true,
        });
        i += d.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const ch = lower[i];
      const isVowel = ch === 'y' ? yIsVowel(lower, i) : isVowelChar(ch);
      tokens.push({ chars: word[i], isVowel, isCons: !isVowel, multi: false });
      i++;
    }
  }
  return tokens;
}

// ─── Silent E Removal ─────────────────────────────────────────────────────────
// "Mike" → strip trailing e since it's silent and would add a phantom syllable.

function removeSilentE(tokens) {
  if (tokens.length < 3) return tokens;
  const last = tokens[tokens.length - 1];
  const prev = tokens[tokens.length - 2];
  // Pattern: word ends in consonant + 'e', and has a prior vowel nucleus
  if (last.chars.toLowerCase() === 'e' && !last.multi && prev.isCons) {
    const priorVowel = tokens.slice(0, -2).some(t => t.isVowel);
    if (priorVowel) return tokens.slice(0, -1);
  }
  return tokens;
}

// ─── Syllable Splitter ────────────────────────────────────────────────────────
// Applies Maximum Onset Principle on the token stream.

function splitTokensIntoSyllables(tokens) {
  const nuclei = tokens.reduce((acc, t, i) => { if (t.isVowel) acc.push(i); return acc; }, []);

  if (nuclei.length <= 1) return [tokens.map(t => t.chars).join('')];

  const breaks = [0];
  for (let n = 0; n < nuclei.length - 1; n++) {
    const v1 = nuclei[n];
    const v2 = nuclei[n + 1];
    const between = tokens.slice(v1 + 1, v2); // consonants between the two vowels

    if (between.length === 0) {
      // Hiatus (adjacent vowel tokens): split between them
      breaks.push(v2);
    } else if (between.length === 1) {
      // Single consonant: goes with the next syllable (open syllable preferred)
      breaks.push(v1 + 1);
    } else if (between.length === 2) {
      // Two consonants: check if second forms a valid onset cluster (l, r, n, w)
      const c2 = between[1].chars[0].toLowerCase();
      if ('lrnw'.includes(c2)) {
        breaks.push(v1 + 1); // keep cluster together as onset of next syllable
      } else {
        breaks.push(v1 + 2); // split coda/onset between them
      }
    } else {
      // 3+ consonants: leave 1 consonant for next onset
      breaks.push(v2 - 1);
    }
  }
  breaks.push(tokens.length);

  const uniqueBreaks = [...new Set(breaks)].sort((a, b) => a - b);
  return uniqueBreaks
    .slice(0, -1)
    .map((start, i) => tokens.slice(start, uniqueBreaks[i + 1]).map(t => t.chars).join(''))
    .filter(s => s.length > 0);
}

// ─── Stress Inference ─────────────────────────────────────────────────────────

/**
 * A syllable is "heavy" if it ends in a consonant or contains a long vowel.
 * Heavy syllables attract stress in many languages (Latin, Swahili, Spanish, etc.)
 */
function isHeavy(syl) {
  const s = syl.toLowerCase();
  const lastCh = s[s.length - 1];
  if (lastCh && !'aeiou'.includes(lastCh)) return true;  // closed syllable
  if (/ee|oo|ea|ai|ou|ay|ey|ie|oa/.test(s)) return true; // long vowel digraph
  return false;
}

/**
 * Infer primary stress index using English/Latinate weight rules.
 *
 * 1-syl  → 0
 * 2-syl  → 0  (trochee default: EM-ma, KAY-la)
 * 3-syl  → penultimate weight check:
 *            heavy penult → stress penult   (Ma-RIN-a, Ka-LEE-sha)
 *            light penult → stress first    (EM-i-ly, STE-pha-nie)
 * 4-syl  → 1  (ee-LIZ-a-beth, ah-LEX-an-der)
 * 5-syl+ → antepenultimate (n-3)
 */
function inferStressIndex(syllables) {
  const n = syllables.length;
  if (n <= 1) return 0;
  if (n === 2) return 0;
  if (n === 3) return isHeavy(syllables[1]) ? 1 : 0;
  if (n === 4) return 1;
  return n - 3;
}

function applyStress(rawSyllables) {
  if (rawSyllables.length === 0) return [];
  const idx = inferStressIndex(rawSyllables);
  return rawSyllables.map((s, i) =>
    i === idx ? s.toUpperCase() : s.toLowerCase()
  );
}

// ─── Language Origin Detection ────────────────────────────────────────────────
// Detects patterns that indicate non-English name origins,
// so we can apply different heuristics or warn the user.

function detectOrigin(word) {
  const w = word.toLowerCase();

  // Irish/Scottish Gaelic — many letters are silent, can't be split phonetically
  if (/^(siobh|caoimh|saoirse|niamh|aoife|oisín|tadgh|sinéad)/.test(w)) return 'gaelic';
  if (/(bh|mh)/.test(w) && w.length > 4) return 'gaelic-possible';

  // Vietnamese — largely monosyllabic with diacritics (stripped here)
  if (/^(nguyen|tran|pham|hoang|dang|bui|duong|ngo|vo|vu|do|ly)$/.test(w)) return 'vietnamese';

  // Arabic — often has transliteration patterns
  if (/^(abd|abu|umm|ibn)/.test(w)) return 'arabic';

  // Chinese transliterations — short, often monosyllabic when romanized
  if (w.length <= 3 && /^(xi|xu|xie|zhou|zhu|zhang|zhao|wei|wu|wang|yang|yu|hui|jin|lin|liu|qi|qian|qiu)$/.test(w)) return 'chinese';

  return 'english';
}

// ─── Core Per-Word Syllabifier ────────────────────────────────────────────────

function syllabifyWord(word) {
  if (!word) return [];
  const key = word.toLowerCase().trim();

  // Handle hyphens recursively
  if (word.includes('-')) {
    return word.split('-').flatMap((part, i, arr) => {
      const syls = syllabifyWord(part);
      return i < arr.length - 1 ? [...syls, '·'] : syls;
    });
  }

  // ── Tier 1: Dictionary ──
  if (NAME_DICT[key]) return [...NAME_DICT[key]];

  // ── Language detection ──
  const origin = detectOrigin(key);

  // For Gaelic and Vietnamese, we can't reliably split — return whole word
  // and let the user edit. The UI will show a "verify" hint.
  if (origin === 'gaelic' || origin === 'vietnamese' || origin === 'chinese') {
    return [word.toUpperCase()];
  }

  // ── Tier 2: Digraph-aware heuristics ──
  let tokens = tokenize(word);
  tokens = removeSilentE(tokens);

  const raw = splitTokensIntoSyllables(tokens);
  return applyStress(raw);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * syllabifyName(fullName) → string[]
 * Main entry point. Handles multi-word names with word separators (·).
 * UPPERCASE = stressed, lowercase = unstressed.
 */
function syllabifyName(fullName) {
  if (!fullName || !fullName.trim()) return [];
  const words = fullName.trim().split(/\s+/);
  if (words.length === 1) return syllabifyWord(words[0]);

  const result = [];
  words.forEach((word, i) => {
    result.push(...syllabifyWord(word));
    if (i < words.length - 1) result.push('·');
  });
  return result;
}

/**
 * isInDictionary(name) → boolean
 * Returns true if any word in the name was found in the curated dictionary.
 */
function isInDictionary(name) {
  return name.trim().toLowerCase().split(/\s+/).some(w => !!NAME_DICT[w]);
}

/**
 * getOriginHint(name) → string | null
 * Returns a user-facing hint if the name is likely non-English, null otherwise.
 */
function getOriginHint(name) {
  const words = name.trim().toLowerCase().split(/\s+/);
  for (const w of words) {
    const o = detectOrigin(w);
    if (o === 'gaelic') return 'This looks like an Irish/Gaelic name. The spelling may not match the pronunciation — please edit the syllables!';
    if (o === 'gaelic-possible') return 'This may have Irish/Gaelic origins — double-check the syllable breakdown.';
    if (o === 'vietnamese') return 'Vietnamese names are often one syllable per word — feel free to simplify.';
    if (o === 'chinese') return 'Chinese romanised names may not split the way you say them — please verify.';
  }
  return null;
}

// Expose globally
window.syllabifyName = syllabifyName;
window.isInDictionary = isInDictionary;
window.getOriginHint = getOriginHint;
