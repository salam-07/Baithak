import mongoose from 'mongoose';

import { Story, Like } from '../models/index.js';
import { STORY_STATUS, PAGINATION, INTEREST_KIND } from '../config/constants.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import {
  KEY_TYPES,
  DIRECTION,
  FEED_KEYS,
  buildKeysetFilter,
  buildSort,
  decodeCursor,
  buildPageMeta,
  parseLimit,
} from '../utils/pagination.js';
import { getActiveInterests } from './interest.service.js';
import { annotateCards } from './keyword-extraction.service.js';
import { listStories } from './story.service.js';
import { CARD_PIPELINE_STAGES, toStoryCard } from './story-card.js';



export const POPULAR_KEYS = Object.freeze([
  { field: 'likeCount', direction: DIRECTION.DESC, type: KEY_TYPES.NUMBER },
  { field: 'publishedAt', direction: DIRECTION.DESC, type: KEY_TYPES.DATE },
  { field: '_id', direction: DIRECTION.DESC, type: KEY_TYPES.OBJECT_ID },
]);

/**
 * Splits the reader's active interests into the three arrays the scoring stage
 * needs, in parallel with their weights.
 *
 * Parallel arrays rather than objects, because the aggregation has to look a
 * value up by position inside `$map` and Mongo has no way to join two arrays of
 * objects on a key within a single `$addFields`. `$indexOfArray` against the
 * refs array gives the position, and `$arrayElemAt` reads the weight at that
 * same position. Both arrays must therefore stay in the same order — which is
 * why they are built together here, in one pass, instead of being assembled
 * separately by each caller.
 */
function splitInterests(interests) {
  const keywords = { refs: [], weights: [] };
  const terms = { refs: [], weights: [] };

  for (const interest of interests) {
    if (interest.kind === INTEREST_KIND.KEYWORD) {
      // Converted here because an Interest stores `ref` as a hex string for the
      // unique index, while a story's `keywords` holds ObjectIds. Comparing the
      // two without converting is the kind of mismatch that produces an empty
      // result and no error.
      if (!mongoose.Types.ObjectId.isValid(interest.ref)) continue;
      keywords.refs.push(new mongoose.Types.ObjectId(interest.ref));
      keywords.weights.push(interest.weight);
    } else if (interest.kind === INTEREST_KIND.TERM) {
      terms.refs.push(interest.ref);
      terms.weights.push(interest.weight);
    }
  }

  return { keywords, terms };
}


function weightedOverlap(field, { refs, weights }) {
  if (refs.length === 0) return 0;

  return {
    $sum: {
      $map: {
        input: { $setIntersection: [{ $ifNull: [`$${field}`, []] }, refs] },
        as: 'matched',
        in: { $arrayElemAt: [weights, { $indexOfArray: [refs, '$$matched'] }] },
      },
    },
  };
}

/**
 * The affinity feed.
 *
 * Cold start is handled by falling back rather than by returning nothing: a
 * reader who has not liked anything yet has no interests, and an empty "for
 * you" screen on day one is a worse answer than the newest stories with a note
 * saying why. The `meta` block states the basis either way, so the client can
 * explain the ordering instead of leaving the reader to guess.
 */
export async function getForYouFeed({ userId, cursor, limit } = {}) {
  const pageSize = parseLimit(limit);

  const interests = await getActiveInterests(userId, { limit: env.feed.maxInterests });

  if (interests.length === 0) {
    const fallback = await listStories({ cursor, limit: pageSize, viewerId: userId });

    return {
      ...fallback,
      meta: {
        ...fallback.meta,
        // Named so the client can say "here are the newest stories" rather than
        // implying a personalisation that is not happening.
        reason: 'no-interests',
        message:
          'You have no interests saved yet, so this is the newest stories. '
          + 'Like a story or add a keyword to shape this feed.',
      },
    };
  }

  const split = splitInterests(interests);

  const windowStart = new Date(Date.now() - env.feed.windowDays * 24 * 60 * 60 * 1000);

  const candidateMatch = {
    status: STORY_STATUS.PUBLISHED,
    publishedAt: { $gte: windowStart },
    $or: [
      ...(split.keywords.refs.length ? [{ keywords: { $in: split.keywords.refs } }] : []),
      ...(split.terms.refs.length ? [{ terms: { $in: split.terms.refs } }] : []),
    ],
  };

  const cursorStage = cursor
    ? [{ $match: buildKeysetFilter(decodeCursor(cursor, FEED_KEYS), FEED_KEYS) }]
    : [];

  const rows = await Story.aggregate([
    { $match: candidateMatch },

    // Cap the working set before anything expensive runs. The score is computed
    // per document and cannot be served from an index, so every document that
    // reaches this point is sorted in memory. Taking the most recent N is what
    // bounds that: without it the cost grows with the corpus, which is the one
    // thing a discovery feed cannot afford.
    { $sort: { publishedAt: -1 } },
    { $limit: PAGINATION.FEED_CANDIDATE_LIMIT },

    {
      $addFields: {
        score: {
          $add: [
            weightedOverlap('keywords', split.keywords),
            weightedOverlap('terms', split.terms),
          ],
        },
      },
    },

    { $sort: buildSort(FEED_KEYS) },
    ...cursorStage,
    { $limit: pageSize + 1 },
    ...CARD_PIPELINE_STAGES,
  ]);

  const { items: cards, meta } = buildPageMeta(rows, pageSize, FEED_KEYS);
  const items = await annotateCards(cards.map(toStoryCard));

  if (items.length > 0) {
    // Marked rather than filtered out. Excluding every story the reader has
    // already appreciated would be a nicer feed and a worse system: it needs
    // the full set of their likes on every request, which grows without bound,
    // and it would make the feed silently shorter as a heavy reader used it.
    // Marking costs one indexed query for the page and lets the client decide.
    const liked = await Like.find(
      { user: userId, story: { $in: items.map((item) => item.id) } },
      'story',
    ).lean();

    const likedIds = new Set(liked.map((row) => String(row.story)));
    for (const item of items) item.viewerHasLiked = likedIds.has(String(item.id));
  }

  const strongest = interests
    .slice(0, 5)
    .map((interest) => ({ kind: interest.kind, label: interest.label, weight: interest.weight }));

  return {
    items,
    meta: {
      ...meta,
      reason: 'affinity',
      // The transparent half of the design: the client can show the reader what
      // this ordering was built from, and the reader can change it, since every
      // entry here is editable on their profile.
      basis: { interests: strongest, totalInterests: interests.length },
      windowDays: env.feed.windowDays,
      candidateLimit: PAGINATION.FEED_CANDIDATE_LIMIT,
      message: 'Ranked by how much of your saved keywords and terms each story matches.',
    },
  };
}

/**
 * "Popular this week", exactly as PRODUCT.md specifies it.
 *
 * The rule is: among posts published in the last seven days, order by unique
 * signed-in appreciations, one per account per post, breaking ties by
 * publication time then by identifier.
 *
 * `likeCount` can be used directly as the unique-appreciation count rather than
 * being recomputed with an aggregation, and that is a property of the Like
 * collection rather than a shortcut. Its unique index on `(user, story)` means
 * there is exactly one document per account per story, so the count of like
 * documents for a story *is* the count of unique signed-in accounts. There is
 * no way for a second account's appreciation to be double-counted, and no
 * anonymous appreciation exists to inflate it.
 *
 * Sorting by `likeCount` first cannot come from the `{status, publishedAt,
 * likeCount}` index, because the index leads on publication. That is accepted:
 * the match on a seven-day window already narrows the set to a size where an
 * explicit sort is cheap, and the index still serves the window itself.
 */
export async function getPopularFeed({ cursor, limit, viewerId } = {}) {
  const pageSize = parseLimit(limit);

  const windowStart = new Date(
    Date.now() - env.feed.popularWindowDays * 24 * 60 * 60 * 1000,
  );

  const filter = {
    status: STORY_STATUS.PUBLISHED,
    publishedAt: { $gte: windowStart },
  };

  if (cursor) {
    Object.assign(filter, buildKeysetFilter(decodeCursor(cursor, POPULAR_KEYS), POPULAR_KEYS));
  }

  const rows = await Story.aggregate([
    { $match: filter },
    { $sort: buildSort(POPULAR_KEYS) },
    { $limit: pageSize + 1 },
    ...CARD_PIPELINE_STAGES,
  ]);

  const { items: cards, meta } = buildPageMeta(rows, pageSize, POPULAR_KEYS);
  const items = await annotateCards(cards.map(toStoryCard));

  if (viewerId && items.length > 0) {
    const liked = await Like.find(
      { user: viewerId, story: { $in: items.map((item) => item.id) } },
      'story',
    ).lean();

    const likedIds = new Set(liked.map((row) => String(row.story)));
    for (const item of items) item.viewerHasLiked = likedIds.has(String(item.id));
  }

  return {
    items,
    meta: {
      ...meta,
      reason: 'popular',
      windowDays: env.feed.popularWindowDays,
      // Stated because PRODUCT.md asks for the rule to be published alongside
      // it, so a reader can see why a story is where it is rather than being
      // asked to trust an unexplained ordering.
      rule:
        `Stories published in the last ${env.feed.popularWindowDays} days, `
        + 'ordered by unique signed-in appreciations, then by publication time.',
    },
  };
}

export default { getForYouFeed, getPopularFeed };
