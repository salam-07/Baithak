import mongoose from 'mongoose';
import { randomUUID, createHash } from 'node:crypto';
import { Keyword, Story } from '../models/index.js';
import { buildMatcher, annotateStory } from './keyword-annotations.js';
import logger from '../utils/logger.js';

const stateSchema = new mongoose.Schema({ _id: String, signature: String, owner: String, leaseUntil: Date });
const State = mongoose.models.KeywordIndexState ?? mongoose.model('KeywordIndexState', stateSchema);
const owner = randomUUID();

export function effectiveKeywordIds(detected, settings = {}) {
  const excluded = new Set((settings.excluded ?? []).map(String));
  return [...new Set([...detected.map(String), ...(settings.custom ?? []).map(String)])].filter(id => !excluded.has(id));
}

export async function rebuildKeywordMetadata() {
  try { await State.updateOne({ _id: 'catalog' }, { $setOnInsert: { signature: '' } }, { upsert: true }); }
  catch (error) { if (error.code !== 11000) throw error; }
  const state = await State.findOneAndUpdate(
    { _id: 'catalog', $or: [{ leaseUntil: { $lt: new Date() } }, { leaseUntil: { $exists: false } }] },
    { $set: { owner, leaseUntil: new Date(Date.now() + 120000) } }, { new: true },
  ).lean();
  if (!state) return;
  try {
    const words = await Keyword.find({}, 'key labels aliases updatedAt revision').sort({ _id: 1 }).lean();
    const signature = createHash('sha256').update(JSON.stringify(words)).digest('hex');
    if (signature === state.signature) return;
    const matcher = buildMatcher(words);
    for await (const story of Story.find({}, 'texts keywordSettings updatedAt').lean().cursor()) {
      const lease = await State.updateOne({ _id: 'catalog', owner }, { $set: { leaseUntil: new Date(Date.now() + 120000) } });
      if (!lease.matchedCount) return;
      const { keywordIds } = annotateStory(story.texts, matcher);
      // Never replace metadata derived from a newer edit.
      await Story.updateOne({ _id: story._id, updatedAt: story.updatedAt }, {
        $set: { keywords: effectiveKeywordIds(keywordIds, story.keywordSettings) },
      }, { timestamps: false });
    }
    const counts = await Story.aggregate([
      { $match: { status: 'published' } }, { $unwind: '$keywords' },
      { $group: { _id: '$keywords', count: { $sum: 1 } } },
    ]);
    const totals = new Map(counts.map(row => [String(row._id), row.count]));
    if (words.length) await Keyword.bulkWrite(words.map(word => ({ updateOne: {
      filter: { _id: word._id }, update: { $set: { storyCount: totals.get(String(word._id)) ?? 0 } }, timestamps: false,
    } })));
    await State.updateOne({ _id: 'catalog', owner }, { $set: { signature } });
  } finally {
    await State.updateOne({ _id: 'catalog', owner }, { $unset: { leaseUntil: 1, owner: 1 } });
  }
}

export function startKeywordIndexer() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await rebuildKeywordMetadata(); }
    catch (error) { logger.error({ err: error }, 'Keyword metadata refresh failed; will retry'); }
    finally { running = false; }
  };
  void tick();
  const timer = setInterval(tick, 30000);
  timer.unref();
  return () => clearInterval(timer);
}
