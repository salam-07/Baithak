import mongoose from 'mongoose';

import { Story, Keyword, User, Like } from '../models/index.js';
import {
  STORY_STATUS,
  MAX_KEYWORDS_PER_STORY,
  PAGINATION,
} from '../config/constants.js';
import { CARD_PIPELINE_STAGES, toStoryCard as toCard } from './story-card.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { detectScript } from '../utils/normalize.js';
import {
  PUBLISHED_KEYS,
  SHUFFLE_CURSOR_KEYS,
  buildKeysetFilter,
  buildSort,
  decodeCursor,
  buildPageMeta,
  parseLimit,
} from '../utils/pagination.js';
import { shuffleIds } from '../utils/shuffle.js';
import { effectiveKeywordIds } from './keyword-metadata.service.js';
import { extractForStory, annotateForStory, annotateCards } from './keyword-extraction.service.js';
import { applyStorySignals } from './interest.service.js';

/**
 * Stories: publishing, editing, reading, and appreciating.
 *
 * The recurring theme in this file is that counters are denormalised, so every
 * write has to keep several of them in step. They are updated in a specific
 * order — the story document first, then the counters — because the story is
 * the source of truth and a failure after it is saved leaves a counter wrong
 * but recoverable, whereas the reverse would lose the story.
 */


/** The same for the keyword index, keyed by id rather than by name. */
async function adjustKeywordCounters(keywordIds, delta) {
  if (!Array.isArray(keywordIds) || keywordIds.length === 0) return;

  const incrementing = delta > 0;

  const operations = keywordIds.map((id) => ({
    updateOne: {
      filter: incrementing ? { _id: id } : { _id: id, storyCount: { $gt: 0 } },
      update: { $inc: { storyCount: delta } },
      upsert: false,
    },
  }));

  try {
    await Keyword.bulkWrite(operations, { ordered: false });
  } catch (error) {
    logger.error({ err: error, delta, keywordIds }, 'Failed to adjust keyword counters');
  }
}

/**
 * Fills in the parts of a text variant a client is allowed to omit.
 *
 * Script is inferred rather than defaulted when absent, because the client
 * cannot always know: a paste from a Punjabi keyboard and a paste from a
 * transliteration tool look the same to the interface. Reading the text is more
 * reliable than trusting a default, and the field only decides rendering.
 */
function prepareTexts(texts = []) {
  return texts.map((text) => ({
    language: text.language,
    script: text.script || detectScript(`${text.title ?? ''} ${text.body ?? ''}`) || undefined,
    title: text.title?.trim(),
    body: text.body?.trim(),
    isOriginal: Boolean(text.isOriginal),
    source: text.source,
  }));
}

/**
 * Publishes a new story.
 *
 * Extraction runs before the save so that keywords and terms are part of the
 * document from the first write, rather than being patched in afterwards by a
 * second update that could fail and leave a story permanently unindexed.
 */
export async function createStory({ authorId, texts, status, storyId, isCurated = false, publishedAt } = {}) {
  const prepared = prepareTexts(texts);

  const { keywordIds, terms } = await extractForStory({ texts: prepared });

  const story = new Story({
    ...(storyId ? { _id: storyId } : {}),
    author: authorId,
    isCurated,
    texts: prepared,
    keywords: keywordIds.slice(0, MAX_KEYWORDS_PER_STORY),
    terms: terms.map((entry) => entry.term),
    status: status ?? STORY_STATUS.PUBLISHED,
  });

  // Set here rather than in a hook so that the transition is explicit: only a
  // story that is actually being published gets a publication time, and an
  // edit later never resets it.
  const isPublished = story.status === STORY_STATUS.PUBLISHED;
  // Date and editorial status are internal seed inputs, never forwarded by the author controller.
  if (isPublished) story.publishedAt = publishedAt ?? new Date();

  await story.save();

  
  await Promise.all([
    isPublished ? adjustKeywordCounters(story.keywords, 1) : Promise.resolve(),
    isPublished
      ? User.updateOne({ _id: authorId }, { $inc: { storyCount: 1 } })
      : Promise.resolve(),
  ]);

  logger.info(
    {
      storyId: String(story._id),
      authorId: String(authorId),
      keywords: story.keywords.length,
      terms: story.terms.length,
    },
    'Story published',
  );

  return story;
}


export async function updateStory({ storyId, userId, updates = {}, isAdmin = false } = {}) {
  const story = await Story.findById(storyId);
  if (!story) throw ApiError.notFound('Story');

  const isOwner = String(story.author) === String(userId);
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You can only edit your own stories.');

  const wasPublished = story.status === STORY_STATUS.PUBLISHED;
  const previousKeywords = (story.keywords ?? []).map(String);

  let textChanged = false;

  if (updates.texts) {
    story.texts = prepareTexts(updates.texts);
    textChanged = true;
  }


  if (typeof updates.status === 'string') {
    story.status = updates.status;

    // Publishing a draft for the first time stamps it. Re-publishing a story
    // that was already public leaves the original date alone, so a removed
    // story returning to the feed is not treated as new.
    if (!wasPublished && story.status === STORY_STATUS.PUBLISHED && !story.publishedAt) {
      story.publishedAt = new Date();
    }
  }

  if (textChanged) {
    const { keywordIds, terms } = await extractForStory({ texts: story.texts });
    story.keywords = effectiveKeywordIds(keywordIds, story.keywordSettings);
    story.terms = terms.map((entry) => entry.term);
  }

  await story.save();

  const isPublished = story.status === STORY_STATUS.PUBLISHED;
  const becamePublished = !wasPublished && isPublished;
  const stoppedBeingPublished = wasPublished && !isPublished;

  
  let addedKeywords = [];
  let removedKeywords = [];

  if (becamePublished) {
    addedKeywords = (story.keywords ?? []).map(String);
  } else if (stoppedBeingPublished) {
    removedKeywords = previousKeywords;
  } else if (isPublished) {

    const nextKeywords = story.keywords.map(String);
    addedKeywords = nextKeywords.filter((id) => !previousKeywords.includes(id));
    removedKeywords = previousKeywords.filter((id) => !nextKeywords.includes(id));
  }

  await Promise.all([
    adjustKeywordCounters(addedKeywords, 1),
    adjustKeywordCounters(removedKeywords, -1),
    // keyword counts: it is derived from published work, so an unpublish takes
    // one off and a re-publish puts it back.
    becamePublished
      ? User.updateOne({ _id: story.author }, { $inc: { storyCount: 1 } })
      : Promise.resolve(),
    stoppedBeingPublished
      ? User.updateOne({ _id: story.author, storyCount: { $gt: 0 } }, { $inc: { storyCount: -1 } })
      : Promise.resolve(),
  ]);

  return story;
}

/**
 * Deletes a story outright.
 *
 * A hard delete rather than a status change. PRODUCT.md leaves the moderation
 * policy undecided, but it does say a reader should be able to delete what they
 * published, and a soft delete would leave the text in the database while the
 * interface claimed it was gone — the kind of gap that becomes a real problem
 * the first time somebody asks. `STORY_STATUS.REMOVED` remains in the enum for
 * moderation to use later, which is a different thing from a reader's own
 * deletion and should be recorded as such when it exists.
 */
export async function deleteStory({ storyId, userId, isAdmin = false } = {}) {
  const story = await Story.findById(storyId);
  if (!story) throw ApiError.notFound('Story');

  const isOwner = String(story.author) === String(userId);
  if (!isOwner && !isAdmin) throw ApiError.forbidden('You can only delete your own stories.');

  const { keywords, status, author } = story;

  await Story.deleteOne({ _id: story._id });

  // Only a published story was contributing to any of these, which is the same
  // rule `createStory` and `updateStory` follow. Decrementing for a draft would
  // take a count off a story that never added one.
  const wasPublished = status === STORY_STATUS.PUBLISHED;

  // Appreciations are removed with the story. Leaving them would keep a
  // reader's affinity carrying the signal of a story they can no longer see.
  const [likeResult] = await Promise.all([
    Like.deleteMany({ story: story._id }),
    wasPublished ? adjustKeywordCounters(keywords, -1) : Promise.resolve(),
    wasPublished
      ? User.updateOne({ _id: author, storyCount: { $gt: 0 } }, { $inc: { storyCount: -1 } })
      : Promise.resolve(),
  ]);

  return { deleted: true, likesRemoved: likeResult?.deletedCount ?? 0 };
}

/**
 * The filter for public reads, built from query parameters.
 *
 * The casts here are not decorative. `find()` casts a string to an ObjectId for
 * you, but `aggregate()` does not — the pipeline is executed by the server
 * against BSON, so a string compared to an ObjectId simply never matches. The
 * failure is silent: a valid-looking request returns an empty feed rather than
 * an error, which is close to the worst kind of bug to chase. Casting
 * explicitly, and rejecting a malformed id with a 400 rather than treating it
 * as "no results", is what keeps that from happening.
 *
 * `status: 'published'` is not negotiable and is never taken from the client —
 * an unpublished story must not be reachable by guessing an id or by passing a
 * status filter.
 */
function buildPublicFilter({ keyword, language, author, search, excludeIds, curated } = {}) {
  const filter = { status: STORY_STATUS.PUBLISHED };
  if (curated === true) filter.isCurated = true;
  if (curated === false) filter.isCurated = { $ne: true };


  if (keyword) {
    if (!mongoose.Types.ObjectId.isValid(keyword)) {
      throw ApiError.badRequest('`keyword` must be a keyword id.');
    }
    filter.keywords = new mongoose.Types.ObjectId(String(keyword));
  }

  // `$all` rather than a bare value: a reader asking for Both wants stories
  // that carry both languages, and a bare match on a multikey field would
  // return stories carrying either one.
  if (language) filter.languages = { $all: language };

  if (author) {
    if (!mongoose.Types.ObjectId.isValid(author)) {
      throw ApiError.badRequest('`author` must be a user id.');
    }
    filter.author = new mongoose.Types.ObjectId(String(author));
  }

  if (excludeIds?.length) filter._id = { $nin: excludeIds };

  if (search) filter.$text = { $search: search };

  return filter;
}

/**
 * One page of the shuffled feed.
 *
 * The order is decided in the application (see `utils/shuffle.js` for why it
 * cannot be a sort in the aggregation), which splits the page into three steps:
 * read the pool, shuffle it, fetch the cards that landed on this page. Only the
 * ids are read for the pool, so the work the shuffle costs is a bounded
 * projection rather than a sort of the same number of documents — the trade the
 * affinity feed makes in the other direction.
 *
 * `meta` comes from `buildPageMeta`, the same as every other listing, so the
 * over-fetch by one and the `nextCursor` it encodes behave identically here.
 */
async function shuffledStoryPage({ filter, cursor, pageSize, seed }) {
  const cursorKeys = SHUFFLE_CURSOR_KEYS;
  const [lastSeen] = cursor ? decodeCursor(cursor, cursorKeys) : [null];

  // The pool: the newest candidates, which the `{status, publishedAt, _id}` index
  // serves directly. Bounding it keeps a shuffled feed's cost independent of how
  // large the corpus is, and it is the same bound the affinity feed puts on its
  // candidates: the deal is "random among the most recent FEED_CANDIDATE_LIMIT
  // published stories". `_id` is in the sort so that the pool is the same set on
  // every page; without a tie-breaker, which of several stories sharing a
  // timestamp lands on the boundary is arbitrary.
  const pool = await Story.find(filter, '_id')
    .sort(buildSort(PUBLISHED_KEYS))
    .limit(PAGINATION.FEED_CANDIDATE_LIMIT)
    .lean();

  const ordered = shuffleIds(pool.map((row) => row._id), seed);

  // Where the reader got to. The cursor names the last card served, so resuming
  // means finding that card again in an order the same seed reproduces. A card
  // that has left the pool — deleted, unpublished, or pushed out by 500 newer
  // stories during one session — cannot be found, and the page restarts from the
  // top instead of failing. `useResource.more()` drops cards it already holds, so
  // a restart repeats nothing on screen.
  const found = lastSeen === null ? -1 : ordered.findIndex((id) => String(id) === String(lastSeen));
  const { items: pageRows, meta } = buildPageMeta(
    ordered.slice(found + 1, found + 1 + pageSize + 1).map((_id) => ({ _id })),
    pageSize,
    cursorKeys,
  );

  const pageIds = pageRows.map((row) => row._id);

  const rows = pageIds.length
    ? await Story.aggregate([{ $match: { _id: { $in: pageIds } } }, ...CARD_PIPELINE_STAGES])
    : [];

  // An `$in` match is free to return its rows in any order, and the order the
  // reader is owed is the shuffled one — so the page is rebuilt around it rather
  // than around whatever the database happened to send back.
  const byId = new Map(rows.map((row) => [String(row._id), row]));
  const cards = pageIds.map((id) => byId.get(String(id))).filter(Boolean);

  return { cards, meta };
}

/**
 * Keyset page over published stories — newest first, or shuffled when a seed
 * asks for it.
 *
 * Unshuffled, `{status, publishedAt, _id}` is exactly the sort key, so the page is
 * an index seek and the cursor is a stored-field predicate that rides along in the
 * same `$match`. Shuffled, no index can serve the order by definition and the page
 * is built differently — see `shuffledStoryPage`.
 *
 * The over-fetch by one is how `hasMore` is determined without running a count. A
 * `countDocuments` here would be a second scan of the same index for a number the
 * client never displays, and on the default feed it would be the most expensive
 * part of the request.
 */
export async function listStories({
  filters = {},
  cursor,
  limit,
  viewerId,
  seed,
} = {}) {
  const pageSize = parseLimit(limit);
  const filter = buildPublicFilter(filters);

  // A seed of `0` is a real seed, so this is a presence test rather than a
  // truthiness one: `?seed=0` deals a shuffle like any other, and `shuffleIds` is
  // written to take any seed rather than to be special-cased at zero.
  const shuffled = seed !== undefined && seed !== null;

  let page;

  if (shuffled) {
    page = await shuffledStoryPage({ filter, cursor, pageSize, seed });
  } else {
    const cursorFilter = cursor ? buildKeysetFilter(decodeCursor(cursor, PUBLISHED_KEYS), PUBLISHED_KEYS) : null;

    const { items: cards, meta } = buildPageMeta(
      await Story.aggregate([
        { $match: cursorFilter ? { ...filter, ...cursorFilter } : filter },
        { $sort: buildSort(PUBLISHED_KEYS) },
        { $limit: pageSize + 1 },
        ...CARD_PIPELINE_STAGES,
      ]),
      pageSize,
      PUBLISHED_KEYS,
    );

    page = { cards, meta };
  }

  const items = await annotateCards(page.cards.map(toCard));
  const { meta } = page;

  if (viewerId && items.length > 0) {
    // One extra query for the whole page rather than one per card. Fetching the
    // reader's likes for just these ids keeps the cost proportional to the page
    // rather than to how much they have appreciated in total.
    const liked = await Like.find(
      { user: viewerId, story: { $in: items.map((item) => item.id) } },
      'story',
    ).lean();

    const likedIds = new Set(liked.map((row) => String(row.story)));
    for (const item of items) item.viewerHasLiked = likedIds.has(String(item.id));
  }

  return { items, meta };
}

/** A single story, with the author attached. Drafts are owner-only. */
export async function getStory({ storyId, viewerId, isAdmin = false } = {}) {
  if (!mongoose.Types.ObjectId.isValid(storyId)) throw ApiError.notFound('Story');

  const story = await Story.findById(storyId)
    .select('-tags -keywordHistory')
    .populate('author', 'name username')
    .lean({ virtuals: false });

  if (!story) throw ApiError.notFound('Story');

  const isOwner = viewerId && String(story.author?._id ?? story.author) === String(viewerId);

  // A draft is invisible to everyone but its author, and the response is a 404
  // rather than a 403 so that the existence of an unpublished story cannot be
  // probed by id.
  if (story.status !== STORY_STATUS.PUBLISHED && !isOwner && !isAdmin) {
    throw ApiError.notFound('Story');
  }

  const [detected, liked] = await Promise.all([
    annotateForStory(story.texts, story.keywordSettings),
    viewerId ? Like.exists({ user: viewerId, story: story._id }) : null,
  ]);
  if (viewerId) story.viewerHasLiked = Boolean(liked);
  story.annotations = detected.annotations;
  story.keywords = detected.keywords;
  story.detectedKeywords = detected.detectedKeywords;
  return story;
}

/**
 * Appreciates a story.
 *
 * Written to be idempotent rather than to reject a repeat. Two taps from the
 * same reader, or a retry after a dropped response, should both leave the
 * story with exactly one appreciation — which the unique index guarantees and
 * the duplicate-key catch turns into a success rather than an error.
 *
 * The counter increment happens only when the insert actually created
 * something, so the count cannot be inflated by retries.
 */
export async function likeStory({ storyId, userId } = {}) {
  if (!mongoose.Types.ObjectId.isValid(storyId)) throw ApiError.notFound('Story');

  const story = await Story.findOne({ _id: storyId, status: STORY_STATUS.PUBLISHED })
    .select('_id keywords terms')
    .lean();

  if (!story) throw ApiError.notFound('Story');

  let created = false;

  try {
    await Like.create({ user: userId, story: story._id });
    created = true;
  } catch (error) {
    if (error?.code === 11000) {
      // Already appreciated. Reported as such so the client can settle its
      // optimistic state, and no counters move.
      return { liked: true, alreadyLiked: true, likeCount: undefined };
    }
    throw error;
  }

  const updated = await Story.findByIdAndUpdate(
    story._id,
    { $inc: { likeCount: 1 } },
    { new: true, select: 'likeCount' },
  ).lean();

  // so that a client which likes a story and immediately opens its profile sees
  // the change; it is a single bulk write against an indexed collection.
  await applyStorySignals({ userId, story, direction: 1 });

  return { liked: true, alreadyLiked: false, likeCount: updated?.likeCount, created };
}

/** Removes an appreciation. Symmetric with `likeStory`, including idempotency. */
export async function unlikeStory({ storyId, userId } = {}) {
  if (!mongoose.Types.ObjectId.isValid(storyId)) throw ApiError.notFound('Story');

  const story = await Story.findOne({ _id: storyId, status: STORY_STATUS.PUBLISHED })
    .select('_id keywords terms')
    .lean();

  if (!story) throw ApiError.notFound('Story');

  const result = await Like.deleteOne({ user: userId, story: story._id });

  if (result.deletedCount === 0) {
    // Nothing to undo. Reported as success — the desired end state already
    // holds, and surfacing an error would make the client's retry logic treat a
    // settled state as a failure.
    return { liked: false, wasLiked: false };
  }

  // Guarded so a drifted counter cannot go negative and start displaying a
  // story with less than no appreciation.
  const updated = await Story.findOneAndUpdate(
    { _id: story._id, likeCount: { $gt: 0 } },
    { $inc: { likeCount: -1 } },
    { new: true, select: 'likeCount' },
  ).lean();

  await applyStorySignals({ userId, story, direction: -1 });

  return { liked: false, wasLiked: true, likeCount: updated?.likeCount };
}

/**
 * An author's own stories, drafts included.
 *
 * Not routed through `buildPublicFilter`, which is the point: this is the one
 * listing that is scoped by ownership instead of by publication, and mixing the
 * two would risk a draft leaking into a public feed.
 */
export async function listStoriesByAuthor({ authorId, cursor, limit } = {}) {
  if (!mongoose.Types.ObjectId.isValid(authorId)) throw ApiError.notFound('Author');

  const pageSize = parseLimit(limit);
  const filter = { author: new mongoose.Types.ObjectId(String(authorId)) };

  if (cursor) {
    Object.assign(filter, buildKeysetFilter(decodeCursor(cursor, PUBLISHED_KEYS), PUBLISHED_KEYS));
  }

  // Drafts have no `publishedAt`, so they sort last under a descending sort on
  // it. Ordering this list by `createdAt` instead would break the shared cursor
  // keys and make a cursor from one listing invalid in another, so the
  // compromise is accepted: published work first, drafts after, and the cursor
  // stays interchangeable with every other listing.
  const rows = await Story.aggregate([
    { $match: filter },
    { $sort: buildSort(PUBLISHED_KEYS) },
    { $limit: pageSize + 1 },
    ...CARD_PIPELINE_STAGES,
  ]);

  const { items: cards, meta } = buildPageMeta(rows, pageSize, PUBLISHED_KEYS);

  return { items: await annotateCards(cards.map(toCard)), meta };
}

export default {
  createStory,
  updateStory,
  deleteStory,
  listStories,
  getStory,
  likeStory,
  unlikeStory,
  listStoriesByAuthor,
};
