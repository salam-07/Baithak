import { Keyword } from '../models/index.js';
import { buildMatcher, annotateStory, annotateExcerpts } from './keyword-annotations.js';
import { effectiveKeywordIds } from './keyword-metadata.service.js';
import { toCardKeyword } from './story-card.js';
import { extractKeywords } from './keyword-matcher.js';

// A fresh database snapshot makes community corrections visible across workers.
// Matching is performed once per story, with one batched lookup for explanations.
export async function annotateForStory(texts = [], settings = {}) {
  const keywords = await Keyword.find({}, 'key labels aliases').sort({ key: 1 }).lean();
  const result = annotateStory(texts, buildMatcher(keywords));
  const ids = new Set(result.keywordIds);
  const excluded = new Set((settings.excluded ?? []).map(String));
  const custom = new Set((settings.custom ?? []).map(String));
  const effective = keywords.filter(word => !excluded.has(String(word._id)));
  const filtered = excluded.size ? annotateStory(texts, buildMatcher(effective)) : result;
  const details = await Keyword.find({ _id: { $in: [...new Set([...ids, ...custom])] } }, 'key labels aliases notes type sources revision').sort({ key: 1 }).lean();
  return { ...filtered, detectedKeywords: details.filter(word => ids.has(String(word._id))), keywords: details.filter(word => !excluded.has(String(word._id))) };
}

/**
 * The same job `annotateForStory` does, for a page of feed cards.
 *
 * A card and a story need the same two things — where a word sits in the text, and the
 * entry that explains it — but they need them at different scale. One matcher is built
 * for the whole page instead of one per row, and one query fetches every entry the page
 * mentions instead of one query per story, so annotating twenty cards costs about what
 * one opened story costs today.
 *
 * Cards carry keyword documents rather than the ids the story stores, because an id
 * alone is unrenderable: nothing in the interface can name a word it knows only as an
 * identifier, which is why a closed card could not mark anything before this.
 */
export async function annotateCards(cards = []) {
  if (cards.length === 0) return cards;

  const words = await Keyword.find({}, 'key labels aliases').sort({ key: 1 }).lean();
  const matcher = buildMatcher(words);
  // Built once per distinct exclusion set rather than once per card. A story that
  // excludes a word is the exception, not the rule, and most readers who do it do it
  // to one story.
  const matchers = new Map();

  const effective = cards.map(card => {
    const excluded = new Set((card.keywordSettings?.excluded ?? []).map(String));
    let active = matcher;
    if (excluded.size) {
      const signature = [...excluded].sort().join(',');
      if (!matchers.has(signature)) matchers.set(signature, buildMatcher(words.filter(word => !excluded.has(String(word._id)))));
      active = matchers.get(signature);
    }
    const { annotations, keywordIds } = annotateExcerpts(card.texts, active);
    card.annotations = annotations;
    // Words the author attached by hand appear nowhere in the text, so they are added
    // here rather than matched — the same union the story page shows.
    return effectiveKeywordIds(keywordIds, card.keywordSettings);
  });

  const used = [...new Set(effective.flat())];
  const entries = await Keyword.find({ _id: { $in: used } }, 'key labels type notes').sort({ key: 1 }).lean();
  // Filtered from one sorted page rather than mapped per card, so each card's words
  // arrive in the same order the story page lists them in and the reader does not see
  // the list reshuffle as the card opens.
  const keywords = entries.map(toCardKeyword);

  cards.forEach((card, index) => {
    const ids = new Set(effective[index]);
    card.keywords = keywords.filter(word => ids.has(String(word._id)));
  });

  return cards;
}

export async function extractForStory({ texts = [] } = {}) {
  const { keywordIds } = await annotateForStory(texts);
  const terms = new Map();
  for (const text of texts) {
    for (const entry of extractKeywords({ title: text.title, body: text.body }).terms) {
      const prior = terms.get(entry.term);
      terms.set(entry.term, { ...entry, score: entry.score + (prior?.score ?? 0) });
    }
  }
  return { keywordIds, terms: [...terms.values()].sort((a, b) => b.score - a.score).slice(0, 12) };
}

export function invalidateKeywordIndex() {}
export function keywordIndexStatus() { return { strategy: 'database-snapshot' }; }
export default { extractForStory, invalidateKeywordIndex, keywordIndexStatus };
