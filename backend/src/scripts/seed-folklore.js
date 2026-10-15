import { randomBytes } from 'node:crypto';
import mongoose from 'mongoose';
import env from '../config/env.js';
import { User, Story, Keyword } from '../models/index.js';
import { createStory } from '../services/story.service.js';
import { FOLK_USERS, FOLK_STORIES, FOLK_KEYWORDS } from '../data/folklore/index.js';
import { seedId } from '../data/folklore/identity.js';

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (process.argv.slice(2).some(arg => arg !== '--dry-run')) throw new Error('Only --dry-run is supported.');
  // Validate the entire collection before making even the first insert.
  for (const spec of FOLK_USERS) await new User({ ...spec, passwordHash: 'preflight-only' }).validate();
  for (const spec of FOLK_KEYWORDS) await new Keyword({ ...spec, related: [] }).validate();
  for (const spec of FOLK_STORIES) await new Story({ author: seedId('user', spec.author), texts: spec.texts, status: 'published' }).validate();
  // Disable automatic collection/index writes, including on a dry run.
  await mongoose.connect(env.mongoUri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  const [users, keywords, stories] = await Promise.all([
    User.find({ $or: [{ username: { $in: FOLK_USERS.map(u => u.username) } }, { _id: { $in: FOLK_USERS.map(u => seedId('user', u.username)) } }] }, '_id username').lean(),
    Keyword.find({ key: { $in: FOLK_KEYWORDS.map(w => w.key) } }, '_id key').lean(),
    Story.find({ _id: { $in: FOLK_STORIES.map(s => seedId('story', s.ref)) } }, '_id').lean(),
  ]);
  const userIds = new Set(users.map(u => String(u._id)));
  const keywordKeys = new Set(keywords.map(w => w.key));
  const storyIds = new Set(stories.map(s => String(s._id)));
  for (const spec of FOLK_USERS) {
    const existing = users.find(u => u.username === spec.username);
    if (existing && String(existing._id) !== String(seedId('user', spec.username))) throw new Error(`Username collision: ${spec.username}`);
  }
  const report = { dryRun, users: { create: 0, skip: 0 }, keywords: { create: 0, skip: 0 }, stories: { create: 0, skip: 0 } };
  for (const spec of FOLK_USERS) {
    const _id = seedId('user', spec.username);
    if (userIds.has(String(_id))) { report.users.skip++; continue; }
    report.users.create++;
    if (!dryRun) {
      const user = new User({ ...spec, _id, role: 'reader', onboardingCompleted: true });
      await user.setPassword(randomBytes(48).toString('base64url'), env.bcryptRounds);
      await user.save();
    }
  }
  const inserted = [];
  for (const spec of FOLK_KEYWORDS) {
    if (keywordKeys.has(spec.key)) { report.keywords.skip++; continue; }
    report.keywords.create++;
    if (!dryRun) {
      const { related, ...fields } = spec;
      await Keyword.create({ ...fields, isCurated: true });
      inserted.push(spec);
    }
  }
  const allWords = dryRun ? [] : await Keyword.find({ key: { $in: FOLK_KEYWORDS.map(w => w.key) } }, '_id key').lean();
  const wordIds = new Map(allWords.map(w => [w.key, w._id]));
  for (const spec of inserted) {
    const related = (spec.related ?? []).map(key => wordIds.get(key)).filter(Boolean);
    if (related.length) await Keyword.updateOne({ key: spec.key }, { $set: { related } });
  }
  for (const spec of FOLK_STORIES) {
    const _id = seedId('story', spec.ref);
    if (storyIds.has(String(_id))) { report.stories.skip++; continue; }
    report.stories.create++;
    if (!dryRun) await createStory({ storyId: _id, authorId: seedId('user', spec.author), texts: spec.texts, status: 'published' });
  }
  console.log(JSON.stringify(report, null, 2));
}
main().catch(error => {
  // Database errors can contain connection strings. Keep credentials out of logs.
  console.error(error.message.startsWith('Username collision') ? error.message : `Folklore seed failed (${error.name}); check database connectivity and corpus validation.`);
  process.exitCode = 1;
}).finally(() => mongoose.disconnect());
