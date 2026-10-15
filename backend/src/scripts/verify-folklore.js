import fs from 'node:fs/promises';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import env from '../config/env.js';
import { User, Story, Keyword } from '../models/index.js';
import { FOLK_USERS, FOLK_STORIES, FOLK_KEYWORDS } from '../data/folklore/index.js';
import { seedId } from '../data/folklore/identity.js';
const folder = new URL('../../../.folklore-qa/', import.meta.url);
const baselinePath = new URL('baseline.json', folder);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const scopes = [
  ['stories', Story, 'author texts status publishedAt'],
  ['users', User, 'username name bio role status onboardingCompleted +passwordHash +location'],
  ['keywords', Keyword, 'key labels notes aliases sources related revision'],
];
async function fingerprint() {
  const result = {};
  for (const [name, model, fields] of scopes) {
    const rows = await model.find({}, fields).sort({ _id: 1 }).lean();
    result[name] = Object.fromEntries(rows.map(row => [String(row._id), hash(row)]));
  }
  return result;
}
async function main() {
  const snapshot = process.argv.includes('--snapshot');
  if (process.argv.slice(2).some(a => a !== '--snapshot')) throw new Error('Unsupported flag');
  await mongoose.connect(env.mongoUri, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000 });
  await fs.mkdir(folder, { recursive: true });
  if (snapshot) {
    // Never replace the evidence from before the seed accidentally.
    const data = await fingerprint();
    await fs.writeFile(baselinePath, JSON.stringify(data, null, 2), { flag: 'wx' });
    console.log(JSON.stringify({ snapshot: Object.fromEntries(Object.entries(data).map(([k,v]) => [k,Object.keys(v).length])) }, null, 2));
    return;
  }
  const baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
  const after = await fingerprint();
  for (const [collection, rows] of Object.entries(baseline)) for (const [id, digest] of Object.entries(rows)) {
    assert.equal(after[collection][id], digest, `Existing ${collection} content changed or removed: ${id}`);
  }
  const ids = FOLK_STORIES.map(s => seedId('story', s.ref));
  const stories = await Story.find({ _id: { $in: ids } }).lean();
  assert.equal(stories.length, 120);
  let keywordLinks = 0;
  for (const spec of FOLK_STORIES) {
    const actual = stories.find(s => String(s._id) === String(seedId('story', spec.ref)));
    assert.equal(actual.status, 'published');
    assert.equal(String(actual.author), String(seedId('user', spec.author)));
    assert.ok(actual.publishedAt);
    assert.ok(actual.keywords.length, spec.ref);
    keywordLinks += actual.keywords.length;
    assert.equal(actual.texts.length, spec.texts.length);
    for (const text of spec.texts) {
      const stored = actual.texts.find(t => t.language === text.language);
      for (const field of ['title','body','script','isOriginal','source']) assert.equal(stored[field], text[field], `${spec.ref}:${field}`);
    }
  }
  for (const spec of FOLK_USERS) {
    const user = await User.findById(seedId('user', spec.username)).lean();
    assert.ok(user);
    assert.equal(user.storyCount, await Story.countDocuments({ author: user._id, status: 'published' }));
  }
  const counts = await Story.aggregate([{ $match: { status: 'published' } }, { $unwind: '$keywords' }, { $group: { _id: '$keywords', count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map(r => [String(r._id),r.count]));
  const words = await Keyword.find({ key: { $in: FOLK_KEYWORDS.map(w=>w.key) } }).lean();
  assert.equal(words.length,600);
  for(const word of words) {
    // Existing counters may already need a rebuild; require newly inserted ones
    // to agree with persisted published-story associations.
    if(!baseline.keywords[String(word._id)]) assert.equal(word.storyCount,countMap.get(String(word._id))??0,word.key);
  }
  const report = {
    verifiedAt: new Date().toISOString(), existingContentPreserved: true,
    before: Object.fromEntries(Object.entries(baseline).map(([k,v])=>[k,Object.keys(v).length])),
    after: Object.fromEntries(Object.entries(after).map(([k,v])=>[k,Object.keys(v).length])),
    added: Object.fromEntries(Object.entries(after).map(([k,v])=>[k,Object.keys(v).length-Object.keys(baseline[k]).length])),
    publishedStories:120, textVersions:240, glossaryEntriesAvailable:600, keywordLinks,
    allNewAuthorCountersCorrect:true, allNewKeywordCountersCorrect:true,
  };
  await fs.writeFile(new URL('verification.json',folder),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(`Folklore verification failed: ${error.name}${error.code==='EEXIST' ? ' (baseline already exists)' : ''}`);if(error.name === 'AssertionError') console.error(error.message);process.exitCode=1;}).finally(()=>mongoose.disconnect());
