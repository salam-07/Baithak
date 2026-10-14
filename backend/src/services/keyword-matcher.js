import { normalizeText, tokenize } from '../utils/normalize.js';
import { isStopword } from '../data/stopwords.js';
import { MAX_DETECTED_TERMS, MIN_TERM_LENGTH } from '../config/constants.js';

/**
 * Keyword matching and term extraction, as pure functions.
 *
 * Nothing here touches the database. The alias table is passed in, the text is
 * passed in, and the result comes back. That separation is what makes the whole
 * extraction path testable without a Mongo instance, and it is what would let a
 * different extractor — a model, a service, a hand-tuned ruleset — replace this
 * one without any caller noticing, since the service that wires it up only
 * depends on this module's return shape.
 */

/**
 * The longest alias, in tokens, that will be looked for.
 *
 * Bounded rather than derived, because a pathological alias in the index (an
 * editor pasting a whole sentence) would make every story cost `n × maxOrder`
 * lookups for no benefit. Five covers every multi-word folk name this is
 * expected to hold — `mirza sahiban da wanga` is four — with room to spare.
 */
const MAX_ALIAS_ORDER = 5;

/**
 * How much a title occurrence counts relative to a body occurrence.
 *
 * A word in the title was chosen by the author to name the story; the same word
 * buried in a paragraph may be incidental. Weighting it is the cheapest way to
 * get the terms to reflect what a story is *about* rather than what it
 * *contains*, without any model.
 */
const TITLE_WEIGHT = 4;

/**
 * Builds the lookup table from curated keywords.
 *
 * `entries` is a list of `{ id, aliases }`. Aliases are normalized here, on the
 * way in, using the same function applied to story text — which is the property
 * the whole matching scheme rests on. Normalizing on only one side would make
 * matching look broken in a way that is very hard to see, since the strings
 * differ by characters that render identically.
 *
 * Conflicts are reported rather than resolved silently. Two keywords claiming
 * the same alias is an editorial mistake with a real consequence — one of them
 * becomes unreachable, and which one depends on load order — so it is surfaced
 * for the caller to log rather than left for someone to notice that a keyword
 * never appears.
 */
export function buildAliasIndex(entries = []) {
  const aliasToId = new Map();
  const conflicts = [];
  let maxOrder = 1;

  for (const entry of entries) {
    if (!entry?.id) continue;

    for (const rawAlias of entry.aliases ?? []) {
      const alias = normalizeText(rawAlias);
      if (!alias) continue;

      const order = alias.split(' ').length;
      if (order > maxOrder) maxOrder = Math.min(order, MAX_ALIAS_ORDER);

      const existing = aliasToId.get(alias);

      if (existing === undefined) {
        aliasToId.set(alias, entry.id);
      } else if (String(existing) !== String(entry.id)) {
        // First registration keeps the alias; the later claimant is recorded.
        conflicts.push({ alias, winner: String(existing), loser: String(entry.id) });
      }
    }
  }

  return { aliasToId, maxOrder: Math.min(maxOrder, MAX_ALIAS_ORDER), conflicts };
}

/**
 * Finds curated keywords in a token list.
 *
 * Greedy longest-match at each position. At token `i`, the longest alias that
 * starts there wins and the tokens it covers are consumed, so matching resumes
 * after it. The alternative — collecting every match and preferring the longest
 * globally — produces the same answer on the cases that matter and costs an
 * extra pass plus an overlap-resolution step to get there.
 *
 * Longest-first matters for a concrete case: with `heer` and `heer ranjha` both
 * in the index, shortest-first would attach `heer` on every mention and then
 * never see `heer ranjha`, losing the distinction between a story that mentions
 * a name and one that tells the legend. Longest-first attaches the specific
 * keyword where it applies and falls back to the general one elsewhere, which
 * is also the behaviour an editor would expect from the alias list.
 *
 * Returns both the matched ids and a mask of which tokens were consumed, since
 * the term extractor needs to know what is already accounted for.
 */
export function findKeywordMatches(tokens, aliasIndex) {
  const matchedIds = [];
  const claimed = new Array(tokens.length).fill(false);

  if (!aliasIndex || tokens.length === 0) {
    return { keywordIds: matchedIds, claimed };
  }

  const { aliasToId, maxOrder } = aliasIndex;
  const count = tokens.length;

  let i = 0;
  while (i < count) {
    let matched = false;
    const largest = Math.min(maxOrder, count - i);

    for (let size = largest; size >= 1; size -= 1) {
      // Building the gram only for sizes above 1 keeps the single-token case —
      // by far the most common — allocation-free.
      const gram = size === 1 ? tokens[i] : tokens.slice(i, i + size).join(' ');
      const id = aliasToId.get(gram);

      if (id === undefined) continue;

      if (!matchedIds.includes(id)) matchedIds.push(id);

      for (let k = i; k < i + size; k += 1) claimed[k] = true;
      i += size;
      matched = true;
      break;
    }

    if (!matched) i += 1;
  }

  return { keywordIds: matchedIds, claimed };
}

/**
 * Ranks the leftover tokens by frequency.
 *
 * These become the story's `terms` — unlinked free text, deliberately kept
 * apart from curated keywords because they are a guess from a word count rather
 * than an editorial claim. They still feed the affinity profile, where a
 * recurring unknown word is a legitimate signal, they are just never presented
 * as entries in the cultural index.
 *
 * Tokens already consumed by a curated match are skipped: the keyword already
 * represents them, and counting them again would double their weight on the
 * profile.
 *
 * `claimed` is positional over `tokens`, and `titleTokens` is required to be
 * the leading segment of `tokens` — the shape `extractKeywords` builds,
 * `[...titleTokens, ...bodyTokens]`. The title pass therefore reads the same
 * mask at the same indices, and it has to: without that, a title phrase that
 * matched a curated keyword is claimed in the body pass but counted again here
 * by value. That is exactly the double-count the paragraph above rules out, and
 * it showed up as `Heer Ranjha` in a title still producing the term `heer`
 * alongside the keyword `heer-ranjha`.
 */
export function extractTerms(tokens, { claimed, titleTokens = [], limit = MAX_DETECTED_TERMS } = {}) {
  if (tokens.length === 0) return [];

  const bodyCounts = new Map();

  for (let i = 0; i < tokens.length; i += 1) {
    if (claimed?.[i]) continue;

    const token = tokens[i];
    if (!isCandidateTerm(token)) continue;

    bodyCounts.set(token, (bodyCounts.get(token) ?? 0) + 1);
  }

  // Title tokens are counted separately and added with a multiplier, rather
  // than being counted in the body too — a word appearing in both would then be
  // weighted as though the title counted as another body occurrence.
  const titleCounts = new Map();
  for (let i = 0; i < titleTokens.length; i += 1) {
    // Positionally, because the title tokens are the head of the concatenated
    // list the mask was built against — see the note above.
    if (claimed?.[i]) continue;

    const token = titleTokens[i];
    if (!isCandidateTerm(token)) continue;
    titleCounts.set(token, (titleCounts.get(token) ?? 0) + 1);
  }

  const scored = [];
  const seen = new Set([...bodyCounts.keys(), ...titleCounts.keys()]);

  for (const token of seen) {
    const bodyCount = bodyCounts.get(token) ?? 0;
    const titleCount = titleCounts.get(token) ?? 0;

    // A term that appears only in the title is still a term. Without the
    // `|| 1` it would score zero and be dropped, which would lose exactly the
    // words the author considered most central.
    const score = (bodyCount || 0) + titleCount * TITLE_WEIGHT;
    if (score <= 0) continue;

    scored.push({ term: token, score, count: bodyCount + titleCount });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Alphabetical tie-break, so the stored terms are stable between runs.
    // Without it, two equally-frequent words would swap places depending on
    // Map iteration order and the same story could produce different terms on
    // a re-save, which would make the data look unstable for no reason.
    return a.term.localeCompare(b.term);
  });

  return scored.slice(0, limit);
}

/**
 * What disqualifies a token from being a term.
 *
 * Stopwords are the obvious case. The rest are the shapes that pass a frequency
 * count but carry no meaning: fragments shorter than three characters, which in
 * Shahmukhi are usually a word broken at a non-joining character rather than a
 * word in its own right; pure digits, which are dates and quantities; and
 * anything left empty by normalization.
 */
function isCandidateTerm(token) {
  if (!token || token.length < MIN_TERM_LENGTH) return false;
  if (isStopword(token)) return false;
  // Unicode-aware digit test, so Arabic-Indic numerals are excluded too — they
  // have already been folded to ASCII by normalization, but a token like `۱۲`
  // written in a script normalization does not cover should still be excluded.
  if (/^[\p{N}]+$/u.test(token)) return false;
  return true;
}

/**
 * The whole extraction pass for one story.
 *
 * Title and body are tokenized separately so the title weight can be applied,
 * then the match runs over their concatenation. Concatenating is what lets a
 * keyword span the boundary — a title ending `heer` and a body opening `ranjha`
 * is a single phrase to a reader — and it is safe because the boundary can only
 * ever join two tokens that are already adjacent in the document.
 */
export function extractKeywords({ title = '', body = '', aliasIndex, termLimit = MAX_DETECTED_TERMS }) {
  const titleTokens = tokenize(normalizeText(title));
  const bodyTokens = tokenize(normalizeText(body));
  const tokens = [...titleTokens, ...bodyTokens];

  const { keywordIds, claimed } = findKeywordMatches(tokens, aliasIndex);

  // `claimed` is indexed against the concatenated list, so the term extractor
  // receives it as-is and the title tokens it is handed separately are matched
  // by value rather than by position.
  const terms = extractTerms(tokens, { claimed, titleTokens, limit: termLimit });

  return { keywordIds, terms };
}

export default {
  buildAliasIndex,
  findKeywordMatches,
  extractTerms,
  extractKeywords,
};
