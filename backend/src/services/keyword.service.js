import mongoose from 'mongoose';

import { Keyword, Story } from '../models/index.js';
import { STORY_STATUS } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { normalizeText } from '../utils/normalize.js';
import {
  KEY_TYPES,
  SHUFFLE_CURSOR_KEYS,
  DIRECTION,
  buildKeysetFilter,
  buildSort,
  decodeCursor,
  buildPageMeta,
  parseLimit,
} from '../utils/pagination.js';
import { shuffleIds } from '../utils/shuffle.js';
import { invalidateKeywordIndex } from './keyword-extraction.service.js';



export const KEYWORD_KEYS = Object.freeze([
  { field: 'storyCount', direction: DIRECTION.DESC, type: KEY_TYPES.NUMBER },
  { field: 'key', direction: DIRECTION.ASC, type: KEY_TYPES.STRING },
]);

/**
 * How many recent stories are examined when deriving relationships from
 * co-occurrence.
 *
 * Bounded, and the bound is the honest part of this: the true co-occurrence
 * count over the whole corpus is a full aggregation over every story carrying
 * the keyword, and it gets slower forever. Sampling the most recent N stories
 * answers "what is this appearing alongside lately", which is the more useful
 * question for discovery anyway, at a cost that does not grow. The trade is
 * recorded in the response as a flag rather than hidden.
 */
const CO_OCCURRENCE_SAMPLE = 500;

function escapeRegex(input) {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Browses the index.
 *
 * Search covers labels and aliases, not just the key, because a reader looking
 * for Vanjhali may type any of its three spellings and none of them is the key.
 */
export async function listKeywords({ search, type, cursor, limit, seed } = {}) {
  const pageSize = parseLimit(limit);
  const filter = {};

  if (type) filter.type = type;

  if (search) {
    // Anchored prefix match across every name a keyword can be found under.
    // Case-insensitivity comes from the collation applied below rather than a
    // regex flag, since a flagged regex cannot use the index.
    const pattern = { $options: 'i', $regex: `^${escapeRegex(search.trim())}` };
    filter.$or = [
      { key: pattern },
      { 'labels.en': pattern },
      { 'labels.pa': pattern },
      { 'labels.roman': pattern },
      { aliases: pattern },
    ];
  }

  // Keep the same shuffled sequence while paging; a new visit supplies a new seed.
  if (seed !== undefined) {
    const pool = await Keyword.find(filter, '_id').sort({ _id: 1 }).lean();
    const ordered = shuffleIds(pool.map(row => row._id), seed);
    const [lastSeen] = cursor ? decodeCursor(cursor, SHUFFLE_CURSOR_KEYS) : [null];
    const start = lastSeen === null ? 0 : ordered.findIndex(id => String(id) === String(lastSeen)) + 1;
    const { items: page, meta } = buildPageMeta(ordered.slice(start, start + pageSize + 1).map(_id => ({ _id })), pageSize, SHUFFLE_CURSOR_KEYS);
    const rows = await Keyword.find({ _id: { $in: page.map(row => row._id) } }).lean();
    const byId = new Map(rows.map(row => [String(row._id), row]));
    return { items: page.map(row => byId.get(String(row._id))).filter(Boolean).map(toKeywordSummary), meta };
  }

  if (cursor) {
    filter.$and = [buildKeysetFilter(decodeCursor(cursor, KEYWORD_KEYS), KEYWORD_KEYS)];
  }

  const rows = await Keyword.find(filter)
    .sort(buildSort(KEYWORD_KEYS))
    .limit(pageSize + 1)
    .collation({ locale: 'en', strength: 2 })
    .lean();

  const { items, meta } = buildPageMeta(rows, pageSize, KEYWORD_KEYS);

  return {
    items: items.map(toKeywordSummary),
    meta,
  };
}

function toKeywordSummary(keyword) {
  return {
    id: keyword._id,
    key: keyword.key,
    labels: {
      en: keyword.labels?.en ?? null,
      pa: keyword.labels?.pa ?? null,
      roman: keyword.labels?.roman ?? null,
    },
    notes: Object.fromEntries(['en', 'pa', 'roman'].map(language => {
      const text = keyword.notes?.[language]?.trim();
      return [language, text ? (text.length > 300 ? text.slice(0, 300).trimEnd() + '…' : text) : null];
    })),
    type: keyword.type,
    isCurated: keyword.isCurated,
    hasSources: (keyword.sources?.length ?? 0) > 0,
    storyCount: keyword.storyCount,
  };
}


export async function getKeywordByKey(key) {
  const keyword = await Keyword.findOne({ key: String(key).toLowerCase() })
    .populate('related', 'key labels type storyCount isCurated sources')
    .lean();

  if (!keyword) throw ApiError.notFound('Keyword');

  const [alsoAppearsWith, recentStories] = await Promise.all([
    findCoOccurringKeywords(keyword._id),
    Story.find({ status: STORY_STATUS.PUBLISHED, keywords: keyword._id }, 'publishedAt likeCount')
      .sort({ publishedAt: -1 })
      .limit(1)
      .lean(),
  ]);

  return {
    ...toKeywordSummary(keyword),
    notes: {
      en: keyword.notes?.en ?? null,
      pa: keyword.notes?.pa ?? null,
      roman: keyword.notes?.roman ?? null,
    },
    aliases: keyword.aliases ?? [],
    revision: keyword.revision ?? 1,
    sources: keyword.sources ?? [],
    related: (keyword.related ?? []).map(toKeywordSummary),
    alsoAppearsWith,
    coOccurrenceSample: CO_OCCURRENCE_SAMPLE,
    latestStoryAt: recentStories[0]?.publishedAt ?? null,
  };
}

/**
 * Keywords that keep showing up in the same stories as this one.
 *
 * The `$limit` before `$unwind` is what makes this affordable, and it is placed
 * carefully. Matching first uses the `{ status, keywords, publishedAt }` index,
 * then the sort and limit cap the working set at a known size, and only then is
 * the keyword array exploded. Doing the unwind first would multiply the working
 * set by the average number of keywords per story before anything had been
 * narrowed down.
 */
async function findCoOccurringKeywords(keywordId, limit = 8) {
  const rows = await Story.aggregate([
    { $match: { status: STORY_STATUS.PUBLISHED, keywords: keywordId } },
    { $sort: { publishedAt: -1 } },
    { $limit: CO_OCCURRENCE_SAMPLE },
    { $unwind: '$keywords' },
    { $match: { keywords: { $ne: keywordId } } },
    { $group: { _id: '$keywords', sharedStories: { $sum: 1 } } },
    { $sort: { sharedStories: -1, _id: 1 } },
    { $limit: limit },
    {
      $lookup: {
        from: Keyword.collection.name,
        localField: '_id',
        foreignField: '_id',
        as: 'keyword',
        pipeline: [{ $project: { key: 1, labels: 1, type: 1, storyCount: 1, isCurated: 1, sources: 1 } }],
      },
    },
    { $unwind: '$keyword' },
  ]);

  return rows.map((row) => ({
    ...toKeywordSummary(row.keyword),
    sharedStories: row.sharedStories,
  }));
}

/**
 * Resolves free text to a keyword, for the "follow this word" path in the
 * reading view.
 *
 * Reads the same normalized alias list the extractor matches against, so the
 * word a reader tapped is resolved by exactly the rules that decided to attach
 * it in the first place. Any other implementation would eventually disagree
 * with the extractor, and the symptom would be a link that works on one story
 * and not on an identically-tagged one.
 */
export async function resolveAlias(rawText) {
  const normalized = normalizeText(rawText);

  if (!normalized) return null;

  return Keyword.findOne({ normalizedAliases: normalized }, 'key labels type storyCount').lean();
}

/** Shared community definition. Atomically reject stale revisions and retain history. */
export async function upsertKeyword({ key, payload, userId }) {
  const { revision, ...changes } = payload;
  const existing = await Keyword.findOne({ key });
  if (existing && revision !== (existing.revision ?? 1)) throw ApiError.conflict('This keyword changed. Reload it before saving.');
  const candidate = existing ? new Keyword(existing.toObject()) : new Keyword({ key });
  Object.assign(candidate, changes);
  candidate.updatedBy = userId;
  candidate.isCurated = existing?.isCurated ?? false;
  if (![candidate.labels?.en, candidate.labels?.roman, candidate.labels?.pa].some(value => value?.trim()) ||
      ![candidate.notes?.en, candidate.notes?.roman, candidate.notes?.pa].some(value => value?.trim())) {
    throw ApiError.validation('Add a name and an explanation.');
  }
  await candidate.validate();
  let keyword;
  if (existing) {
    const fields = ['labels', 'notes', 'aliases', 'normalizedAliases', 'type', 'sources', 'related', 'updatedBy'];
    const data = candidate.toObject();
    const snapshot = Object.fromEntries(fields.filter(field => field !== 'normalizedAliases').map(field => [field, existing[field]]));
    const revisionFilter = revision === 1
      ? { $or: [{ revision: 1 }, { revision: { $exists: false } }] } : { revision: existing.revision };
    keyword = await Keyword.findOneAndUpdate(
      { _id: existing._id, ...revisionFilter },
      { $set: { ...Object.fromEntries(fields.map(field => [field, data[field]])), revision: revision + 1 },
        $push: { history: { $each: [{ ...snapshot, revision, savedAt: new Date(), replacedBy: userId }], $slice: -50 } } },
      { new: true, runValidators: true },
    );
    if (!keyword) throw ApiError.conflict('This keyword changed. Reload it before saving.');
  } else {
    if (revision) throw ApiError.conflict('This keyword no longer exists.');
    try { keyword = await candidate.save(); }
    catch (error) {
      if (error.code === 11000) throw ApiError.conflict('That keyword key already exists. Open it to contribute.');
      throw error;
    }
  }
  invalidateKeywordIndex();
  return { keyword, created: !existing };
}

/**
 * Forces the in-memory alias table to reload on this instance.
 *
 * Exposed because the TTL means a write on another instance is not seen here
 * until it expires, and an editor who has just corrected a keyword should not
 * have to wait to see the effect on the instance they are using.
 */
export function refreshKeywordIndex() {
  invalidateKeywordIndex();
}

export async function getKeywordById(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) throw ApiError.notFound('Keyword');

  const keyword = await Keyword.findById(id).lean();
  if (!keyword) throw ApiError.notFound('Keyword');

  return toKeywordSummary(keyword);
}

export default {
  listKeywords,
  getKeywordByKey,
  getKeywordById,
  resolveAlias,
  upsertKeyword,
  refreshKeywordIndex,
  KEYWORD_KEYS,
};
