import '../test-helpers/env.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Story, Keyword } from './index.js';
import { createStorySchema, updateStorySchema, listStoriesQuerySchema } from '../validators/story.validator.js';
import { requireRole } from '../middlewares/auth.js';
import { listStories } from '../services/story.service.js';
import { toStoryCard } from '../services/story-card.js';
import { buildMatcher, annotateStory } from '../services/keyword-annotations.js';
const author = '000000000000000000000001';
const texts = [
  { language: 'en', script: 'latin', title: 'A tale', body: 'Heer walks home.', isOriginal: true },
  { language: 'pa', script: 'shahmukhi', title: 'اک کہانی', body: 'ہیر گھر جاندی اے۔', isOriginal: false },
  { language: 'pa', script: 'roman', title: 'Ik kahani', body: 'Heer ghar jaandi ae.', isOriginal: false },
];

test('curated stories support three scripts with independent keyword annotations', async () => {
  const words = [{ _id: 'heer', key: 'heer', labels: { en: 'Heer', pa: 'ہیر', roman: 'Heer' } }];
  const matcher = buildMatcher(words);
  createStorySchema.parse({ texts });
  const doc = new Story({ author, texts, isCurated: true, status: 'published' });
  await doc.validate();
  assert.equal(doc.toCard().isCurated, true);
  assert.equal(toStoryCard(doc.toObject()).isCurated, true);
  const { annotations } = annotateStory(texts, matcher);
  assert.equal(annotations.length, 3);
  for (const [index, text] of texts.entries()) {
    assert.equal(annotations[index].language, text.language);
    assert.equal(annotations[index].script, text.script);
    assert.equal(annotations[index].body.length, 1);
  }
});

test('duplicate script variants are rejected while missing curated translations cannot be saved', async () => {
  assert.equal(createStorySchema.safeParse({ texts: [...texts, texts[1]] }).success, false);
  await assert.rejects(new Story({ author, texts: texts.slice(0, 2), isCurated: true }).validate(), /Curated stories need/);
  const ordinary = new Story({ author, texts: texts.slice(0, 2) });
  await ordinary.validate();
  assert.equal(ordinary.isCurated, false);
  assert.equal(toStoryCard({}).isCurated, false);
});

test('ordinary author payloads cannot set curation and editorial roles use the current user', () => {
  assert.equal(createStorySchema.parse({ texts, isCurated: true }).isCurated, undefined);
  assert.equal(updateStorySchema.safeParse({ isCurated: true }).success, false);
  const guard = requireRole('editor', 'admin');
  let error;
  guard({ auth: { role: 'admin' }, user: { role: 'reader' } }, {}, e => { error = e; });
  assert.equal(error.statusCode, 403);
  guard({ auth: { role: 'reader' }, user: { role: 'editor' } }, {}, e => { error = e; });
  assert.equal(error, undefined);
});

test('curated filtering reaches both normal and shuffled public queries', async t => {
  assert.equal(listStoriesQuerySchema.parse({ curated: 'false' }).curated, false);
  assert.equal(listStoriesQuerySchema.safeParse({ curated: 'yes' }).success, false);
  const matches = [];
  t.mock.method(Story, 'aggregate', async pipeline => { matches.push(pipeline[0].$match); return []; });
  t.mock.method(Story, 'find', filter => {
    matches.push(filter);
    const query = { sort: () => query, limit: () => query, select: () => query, lean: async () => [] };
    return query;
  });
  t.mock.method(Keyword, 'find', () => { throw new Error('Empty pages must not load keywords'); });
  for (const seed of [undefined, 42]) await listStories({ filters: { curated: true }, seed });
  assert(matches.length >= 2);
  assert(matches.every(filter => filter.status === 'published' && filter.isCurated === true));
});

