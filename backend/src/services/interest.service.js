import mongoose from 'mongoose';

import { Interest, Keyword } from '../models/index.js';
import {
  INTEREST_KIND,
  INTEREST_KINDS,
  INTEREST_SOURCE,
  INTEREST_WEIGHT,
  INTEREST_MIN_ACTIVE_WEIGHT,
  MAX_KEYWORDS_PER_STORY,
} from '../config/constants.js';
import { normalizeText } from '../utils/normalize.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';



/**
 * Turns one story's discoverable surface into a list of signals.
 *
 * A story contributes two kinds of thing, and they are kept apart rather than
 * merged because the feed scores them against different fields on the story
 * document. The labels are denormalised at this point so that rendering a
 * profile later is a single read with no joins.
 *
 * Keyword labels are fetched here rather than expected to be populated by the
 * caller. It is one extra indexed read on a write path — likes are rare
 * compared to reads — and it removes a precondition that would otherwise fail
 * silently: a caller passing unpopulated ObjectIds would produce interests
 * labelled with a hex id, which nothing would catch until a human saw it.
 */
async function buildSignalsFromStory(story) {
  const signals = [];


  for (const term of story.terms ?? []) {
    const ref = normalizeText(term);
    if (ref) signals.push({ kind: INTEREST_KIND.TERM, ref, label: term });
  }

  const keywordIds = (story.keywords ?? []).slice(0, MAX_KEYWORDS_PER_STORY);
  if (keywordIds.length > 0) {
    const keywords = await Keyword.find({ _id: { $in: keywordIds } }, 'key labels').lean();

    for (const keyword of keywords) {
      signals.push({
        kind: INTEREST_KIND.KEYWORD,
        // Hex string rather than the ObjectId, so that `ref` is one type across
        // all two kinds. See the note on the field in the model.
        ref: String(keyword._id),
        label: keyword.labels?.en ?? keyword.labels?.pa ?? keyword.labels?.roman ?? keyword.key,
      });
    }
  }

  return signals;
}

/**
 * Applies a weight change from a like or an unlike.
 *
 * `blocked` is untouched on purpose. A like is an inferred signal and a block is
 * a stated one; letting an inferred signal clear a stated preference would mean
 * a reader's explicit removal could be undone without them doing anything.
 *
 * Note the `$setOnInsert`: `source` and `blocked` are only seeded when the row
 * is created. Putting either in `$set` as well would be a conflicting-update
 * error from Mongo, and putting `blocked` in `$set` at all would be the bug
 * described above.
 */
async function applyLikeSignal({ userId, kind, ref, label, delta }) {
  return Interest.updateOne(
    { user: userId, kind, ref },
    {
      $inc: { weight: delta },
      $set: { label, lastSignalAt: new Date() },
      $setOnInsert: { user: userId, kind, ref, source: INTEREST_SOURCE.LIKE, blocked: false },
    },
    { upsert: true },
  );
}


export async function applyStorySignals({ userId, story, direction }) {
  if (!userId || !story) return { matched: 0, modified: 0 };

  const signals = await buildSignalsFromStory(story);
  if (signals.length === 0) return { matched: 0, modified: 0 };

  const delta = direction >= 0 ? 1 : -1;

  const operations = signals.map((signal) => ({
    updateOne: {
      filter: { user: userId, kind: signal.kind, ref: signal.ref },
      update: {
        $inc: { weight: delta },
        $set: { label: signal.label, lastSignalAt: new Date() },
        $setOnInsert: {
          user: userId,
          kind: signal.kind,
          ref: signal.ref,
          source: INTEREST_SOURCE.LIKE,
          blocked: false,
        },
      },
      upsert: true,
    },
  }));

  try {
    const result = await Interest.bulkWrite(operations, { ordered: false });
    return { matched: result.matchedCount, modified: result.modifiedCount };
  } catch (error) {
    // A duplicate-key error from an unordered bulk write still applied every
    // other operation, so this is not a failed write — it is the race working
    // as intended. Anything else is a real problem and is rethrown.
    if (error?.code === 11000 || error?.writeErrors?.every((e) => e?.code === 11000)) {
      logger.debug({ err: error, userId }, 'Bulk interest upsert hit a duplicate; treated as a race');
      return { matched: 0, modified: 0 };
    }

    throw error;
  }
}

/**
 * The feed's read: the reader's strongest active interests.
 *
 * Filtered in the query rather than in memory because the blocked and
 * below-threshold rows are exactly the ones a long-standing reader accumulates
 * most of, and loading them only to discard them would make the cost of this
 * read grow with how long somebody has used the platform — which is backwards.
 */
export async function getActiveInterests(userId, { limit = 50 } = {}) {
  return Interest.find({
    user: userId,
    kind: { $in: INTEREST_KINDS },
    blocked: false,
    weight: { $gte: INTEREST_MIN_ACTIVE_WEIGHT },
  })
    .sort({ weight: -1, lastSignalAt: -1 })
    .limit(limit)
    .lean();
}

/** Everything on the profile, including suppressed entries, for the owner's view. */
export async function listInterests(userId, { kind, includeBlocked = true } = {}) {
  const filter = { user: userId, kind: { $in: INTEREST_KINDS } };
  if (kind) filter.kind = kind;
  if (!includeBlocked) filter.blocked = false;

  return Interest.find(filter).sort({ weight: -1, lastSignalAt: -1 }).limit(500).lean();
}

/**
 * A reader adding something to their own profile.
 *
 * Weighted above a like, because a deliberate choice is a clearer statement
 * than a single interaction. It also clears any block, which is what makes the
 * suppression reversible by the only person entitled to reverse it.
 */
export async function addInterest({ userId, kind, ref, label }) {
  const normalizedRef = kind === INTEREST_KIND.KEYWORD ? String(ref) : normalizeText(ref);

  if (!normalizedRef) {
    throw ApiError.badRequest('An interest needs a value.');
  }

  let displayLabel = label;

  if (kind === INTEREST_KIND.KEYWORD) {
    // Checked with `isValid` before the query, because passing a malformed id
    // to `findById` raises a CastError, which surfaces as a 500 and tells the
    // caller nothing. A client sending a stale or hand-edited id should get a
    // clear 404.
    if (!mongoose.Types.ObjectId.isValid(normalizedRef)) throw ApiError.notFound('Keyword');

    const keyword = await Keyword.findById(normalizedRef, 'key labels').lean();
    if (!keyword) throw ApiError.notFound('Keyword');

    // The keyword's own label beats the id a client may have sent, and beats a
    // client-supplied label that could disagree with the cultural index.
    displayLabel = keyword.labels?.en ?? keyword.labels?.pa ?? keyword.labels?.roman ?? keyword.key;
  }

  if (!displayLabel) displayLabel = normalizedRef;

  await Interest.updateOne(
    { user: userId, kind, ref: normalizedRef },
    {
      $inc: { weight: INTEREST_WEIGHT[INTEREST_SOURCE.MANUAL] },
      $set: {
        label: displayLabel,
        source: INTEREST_SOURCE.MANUAL,
        blocked: false,
        lastSignalAt: new Date(),
      },
      $setOnInsert: { user: userId, kind, ref: normalizedRef },
    },
    { upsert: true },
  );

  return Interest.findOne({ user: userId, kind, ref: normalizedRef }).lean();
}


export async function removeInterest({ userId, kind, ref }) {
  const normalizedRef = kind === INTEREST_KIND.KEYWORD ? String(ref) : normalizeText(ref);

  if (!normalizedRef) throw ApiError.badRequest('An interest needs a value.');

  const existing = await Interest.findOne({ user: userId, kind, ref: normalizedRef });

  if (!existing) {
    await Interest.create({
      user: userId,
      kind,
      ref: normalizedRef,
      label: normalizedRef,
      weight: 0,
      blocked: true,
      source: INTEREST_SOURCE.MANUAL,
      lastSignalAt: new Date(),
    });

    return { removed: true, existed: false };
  }

  existing.blocked = true;
  existing.source = INTEREST_SOURCE.MANUAL;
  existing.lastSignalAt = new Date();
  await existing.save();

  return { removed: true, existed: true };
}

/**
 * Drops rows that carry no signal: never blocked, and weight at or below zero
 * after all the likes that created them were undone.
 *
 * Not run automatically. Deleting on the write path would mean an unlike that
 * happened to take an entry to zero erases the row, and a subsequent like then
 * starts from scratch — which is fine arithmetically but throws away the
 * `lastSignalAt` history that makes the affinity sort stable. A periodic sweep
 * gets the space back without that.
 */
export async function pruneInterests({ dryRun = false, batchSize = 1000 } = {}) {
  const filter = { blocked: false, weight: { $lte: 0 } };

  if (dryRun) {
    const candidateCount = await Interest.countDocuments(filter);
    return { dryRun: true, candidates: candidateCount, deleted: 0 };
  }

  // Deleted in batches with a bounded loop, so a first run against a large
  // collection cannot hold a long-running delete that blocks other writers.
  let deleted = 0;
  let batch = 0;
  const MAX_BATCHES = 100;

  do {
    const ids = await Interest.find(filter, '_id').limit(batchSize).lean();
    if (ids.length === 0) break;

    const result = await Interest.deleteMany({ _id: { $in: ids.map((row) => row._id) } });
    deleted += result.deletedCount;
    batch += 1;
  } while (batch < MAX_BATCHES);

  return { dryRun: false, deleted, batches: batch };
}

export default {
  applyStorySignals,
  getActiveInterests,
  listInterests,
  addInterest,
  removeInterest,
  pruneInterests,
};
