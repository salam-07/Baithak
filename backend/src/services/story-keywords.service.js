import { Keyword, Story } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import { annotateForStory } from './keyword-extraction.service.js';
import { effectiveKeywordIds } from './keyword-metadata.service.js';

export async function saveStoryKeywords({ storyId, userId, settings, revision }) {
  const story = await Story.findById(storyId).lean();
  if (!story || (story.status !== 'published' && String(story.author) !== String(userId))) throw ApiError.notFound('Story');
  const ids = [...new Set([...settings.custom, ...settings.excluded, ...settings.notes.map(note => note.keyword)])];
  if (await Keyword.countDocuments({ _id: { $in: ids } }) !== ids.length) throw ApiError.validation('One of these keywords no longer exists.');
  const detected = await annotateForStory(story.texts);
  const keywords = effectiveKeywordIds(detected.keywordIds, settings);
  const revisionFilter = revision === 1 ? { $or: [{ keywordRevision: 1 }, { keywordRevision: { $exists: false } }] } : { keywordRevision: revision };
  const saved = await Story.findOneAndUpdate(
    { _id: storyId, updatedAt: story.updatedAt, ...revisionFilter },
    { $set: { keywordSettings: settings, keywords, keywordRevision: revision + 1 },
      $push: { keywordHistory: { $each: [{ settings: story.keywordSettings, revision, user: userId, date: new Date() }], $slice: -50 } } },
    { new: true, runValidators: true },
  );
  if (!saved) throw ApiError.conflict('This story changed. Reload before saving.');
  // Recount only affected entries; drafts never affect public counts.
  const affected = [...new Set([...(story.keywords ?? []).map(String), ...keywords])];
  for (const id of affected) {
    const count = await Story.countDocuments({ status: 'published', keywords: id });
    await Keyword.updateOne({ _id: id }, { $set: { storyCount: count } }, { timestamps: false });
  }
  return { revision: saved.keywordRevision };
}
