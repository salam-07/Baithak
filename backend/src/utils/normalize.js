

// Harakat and other Arabic combining marks. Authors add these for readability
// and they are never part of a word's identity: `کِہانی` and `کہانی` are the
// same word. U+0670 is superscript alef, which behaves like a harakah here.
const ARABIC_DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۭ]/g;

// Tatweel is a stretcher used purely for justification — `کـــہانی` carries no
// more information than `کہانی`.
const TATWEEL = /ـ/g;

// Zero-width joiners, bidi control characters, word joiner and BOM. These
// arrive from copy-pasted text and from keyboards that emit a ZWNJ between
// letters. They are invisible, which makes them the hardest kind of difference
// to debug by eye: two strings that render identically and compare unequal.
const INVISIBLE = /[​-‏⁠؜﻿]/g;

// Latin combining marks, applied after NFD decomposition so that every
// precomposed accented character is handled by one range instead of a table.
const LATIN_COMBINING = /[̀-ͯ]/g;

/**
 * Character-level equivalences within Perso-Arabic script.
 *
 * Grouped by what is actually being said: different *encodings of the same
 * letter*, not different letters.
 *  - Alef (U+0627): hamza (U+0623), madda (U+0622), hamza-below (U+0625) and
 *    wasla (U+0671) forms all read as bare alef.
 *  - Yeh: Arabic yeh (U+064A) and alef maksura (U+0649) are the same letter as
 *    Persian yeh (U+06CC). Bari ye (U+06D2) is deliberately NOT included — it
 *    is a distinct Punjabi letter and folding it would merge real words.
 *  - Kaf: Arabic kaf (U+0643) against Persian/Urdu kaf (U+06A9). Identical
 *    letter, two codepoints.
 *  - Heh: Arabic heh (U+0647) and teh marbuta (U+0629) read as Urdu heh
 *    (U+06C1). Do-chashmi he (U+06BE) is deliberately NOT included; it marks
 *    aspiration and changes the word.
 */
const ARABIC_FOLDING = new Map([
  ['آ', 'ا'], // آ -> ا
  ['أ', 'ا'], // أ -> ا
  ['إ', 'ا'], // إ -> ا
  ['ٱ', 'ا'], // ٱ -> ا
  ['ي', 'ی'], // ي -> ی
  ['ى', 'ی'], // ى -> ی
  ['ې', 'ی'], // ې -> ی
  ['ك', 'ک'], // ك -> ک
  ['ة', 'ہ'], // ة -> ہ
  ['ه', 'ہ'], // ه -> ہ
  ['ۀ', 'ہ'], // ۀ -> ہ
]);

/**
 * Arabic-Indic (U+0660–U+0669) and Extended Arabic-Indic (U+06F0–U+06F9)
 * digits, mapped to ASCII. A story dated `۱۹۴۷` and one dated `1947` are the
 * same year, and leaving them distinct also splits tokens at a boundary a
 * reader would not see.
 */
function buildDigitMap() {
  const map = new Map();

  for (let digit = 0; digit <= 9; digit += 1) {
    map.set(String.fromCharCode(0x0660 + digit), String(digit));
    map.set(String.fromCharCode(0x06F0 + digit), String(digit));
  }

  return map;
}

const FOLDING = new Map([...ARABIC_FOLDING, ...buildDigitMap()]);


export function normalizeText(input) {
  if (input === null || input === undefined) return '';

  let text = String(input)
    .normalize('NFC')
    .replace(INVISIBLE, '')
    .replace(TATWEEL, '')
    .replace(ARABIC_DIACRITICS, '');

  // Lowercase before decomposition: the Turkish dotted capital I lowercases to
  // two codepoints, and doing it after NFD would leave a stray combining dot.
  text = text.toLowerCase().normalize('NFD').replace(LATIN_COMBINING, '').normalize('NFC');

  let folded = '';
  for (const char of text) folded += FOLDING.get(char) ?? char;

  // Collapse whitespace last, so characters removed above cannot leave a run of
  return folded.replace(/\s+/g, ' ').trim();
}

/**
 * Splits normalized text into tokens.
 *
 * Unicode property escapes are used rather than a script range so that a story
 * mixing Shahmukhi, Roman Urdu and English — which is the normal case here —
 * tokenizes in one pass. Tokens are maximal runs of letters and digits; every
 * form of punctuation is a boundary, including the Arabic comma and full stop.
 */
export function tokenize(normalizedText) {
  if (!normalizedText) return [];
  return normalizedText.match(/[\p{L}\p{N}]+/gu) ?? [];
}

/** Convenience for the common "normalize then split" pair. */
export function normalizeAndTokenize(input) {
  return tokenize(normalizeText(input));
}

/**
 * N-grams over a token list, up to `maxOrder` tokens.
 *
 * Matching has to happen on grams rather than single tokens because a large
 * share of this vocabulary is multi-word: `heer ranjha`, `mirza sahiban`, the
 * token pairs that make a compound place name. Single-token matching would
 * attach the keyword `heer` to any story mentioning the name in passing and
 * miss `heer ranjha` entirely on the stories that are actually about the legend.
 *
 * Grams are joined with a space, matching how aliases are stored and looked up.
 */
export function buildNGrams(tokens, maxOrder = 3) {
  const grams = [];

  for (let size = 1; size <= maxOrder; size += 1) {
    for (let start = 0; start + size <= tokens.length; start += 1) {
      grams.push(tokens.slice(start, start + size).join(' '));
    }
  }

  return grams;
}



export function slugify(input) {
  return normalizeText(input)
    .normalize('NFD')
    .replace(LATIN_COMBINING, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

// Perso-Arabic blocks: Arabic, Arabic Supplement, Arabic Presentation Forms
// A and B. Covers Shahmukhi as written, plus the presentation forms that some
// fonts and keyboards substitute.
const SHAHMUKHI_RANGE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/u;

// Everything that shares those blocks without being a letter. The blocks are
// not letter-only: U+0660–U+0669 and U+06F0–U+06F9 are Arabic-Indic and
// Extended Arabic-Indic digits, U+060C and U+061B are the Arabic comma and
// semicolon, U+06DD is the end-of-ayah sign, and U+FEFF is the BOM. Marks are
// included because a lone harakah is decoration, not prose.
//
// Tatweel is here too, and it is the one entry a general category cannot
// express: U+0640 is category Lm, so `\p{L}` would keep it, and a run of pure
// justification would read as Shahmukhi. Its presence is belt-and-braces — the
// function below normalizes first and `normalizeText` strips tatweel outright —
// but the two are kept in agreement so that neither has to be the one that is
// right.
const NON_LETTER = /[\p{M}\p{N}\p{P}\p{S}\p{Z}\p{C}ـ]/gu;

/** True when the string contains at least one Perso-Arabic letter. */
export function containsShahmukhi(input) {
  // Normalized first, so harakat and tatweel are already gone: both are
  // decoration rather than content, and `normalizeText` is the one place that
  // decides what they are. What survives it and is still not a letter is the
  // digits, the punctuation and the BOM, which is what NON_LETTER lists.
  const text = normalizeText(input);
  if (!text) return false;

  // The cheap test next: most input is Latin, and this rejects it in one pass
  // without allocating. Only text that already contains *something* from the
  // blocks is worth the second pass.
  if (!SHAHMUKHI_RANGE.test(text)) return false;

  // Digits and punctuation are not evidence of Shahmukhi prose. Without this,
  // a story titled `۱۹۴۷` — a year, in the numerals a Punjabi writer would
  // actually use — would be classified as Shahmukhi, and the title would be
  // rendered right-to-left in an Arabic font on the strength of its digits.
  // Replacing rather than removing keeps the two tests looking at the same
  // shape of string, and a space can never itself match SHAHMUKHI_RANGE.
  return SHAHMUKHI_RANGE.test(text.replace(NON_LETTER, ' '));
}

/**
 * Roman Urdu signals, deliberately split in two because they need opposite
 * matching rules.
 *
 * The digraphs are matched anywhere inside a word, because that is the only
 * place they occur: Roman Urdu writes aspiration into the stem — `vanjhali`,
 * `kihdi`, `ladhar` — so it is never a standalone token. Anchoring them to word
 * boundaries, which is what this constant did before, leaves the entire digraph
 * half of the test inert: `\bkh\b` matches only a word spelled exactly `kh`.
 *
 * `gh` and `nh` are left out on purpose even though the orthography uses both.
 * English is full of them — `night`, `right`, `light`, `through`, `enough`, and
 * `unhappy`, `inhabit`, `unhand` — so a containment test would classify a large
 * share of ordinary English prose as Roman Urdu and, since `script` is a
 * rendering hint, lay that prose out in an Urdu font. The six kept are close to
 * unambiguous: `jh` is effectively absent from English, and the rest turn up
 * mainly in loanwords that are themselves South Asian (`khaki`, `khan`,
 * `dharma`, `bhangra`).
 */
const ROMAN_URDU_DIGRAPHS = /jh|bh|dh|rh|kh|chh/;

/**
 * The highest-frequency Roman Urdu function words, matched whole.
 *
 * Whole-word matching is what keeps these from firing on English that merely
 * contains them — containment would read `nail` as `nal` and `thin` as `thi`.
 *
 * `hai` is the most valuable entry: it is the copula, the single most common
 * word in the language, and not an English word, which makes it the strongest
 * single signal available. The rest are the postpositions, pronouns and verb
 * endings English does not share.
 */
const ROMAN_URDU_WORDS = /\b(?:hai|vich|nal|nahi|nahin|kya|hun|ute|tha|thi|ik)\b/;

/**
 * Detects the script a passage is written in. Returns `'shahmukhi'`, `'latin'`,
 * `'roman'`, or null when nothing is recognisable.
 *
 * The order of the tests is the logic. Shahmukhi first: a passage containing
 * Perso-Arabic letters is Shahmukhi regardless of any Latin mixed into it,
 * because mixed passages are common here and the Perso-Arabic presence is the
 * stronger signal.
 *
 * The Latin case is a heuristic and is documented as one rather than presented
 * as classification. There is no reliable way to tell `ki` from an English word
 * without a lexicon, so this looks for the markers above and otherwise answers
 * `latin`. That default is the safe one: script is a display hint that decides
 * text direction and font, not a behaviour switch, so a wrong answer costs a
 * slightly-off font rather than a broken read.
 */
export function detectScript(input) {
  const text = String(input ?? '');
  if (!text.trim()) return null;

  if (containsShahmukhi(text)) return 'shahmukhi';
  if (!/[A-Za-z]/.test(text)) return null;

  const lower = text.toLowerCase();

  if (ROMAN_URDU_WORDS.test(lower)) return 'roman';
  if (ROMAN_URDU_DIGRAPHS.test(lower)) return 'roman';

  return 'latin';
}

export default {
  normalizeText,
  tokenize,
  normalizeAndTokenize,
  buildNGrams,
  slugify,
  containsShahmukhi,
  detectScript,
};
