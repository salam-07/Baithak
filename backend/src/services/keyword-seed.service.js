import { SEED_KEYWORDS } from '../data/seedKeywords.js';
import { Keyword } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Loads the starting cultural index.
 *
 * Extracted from `scripts/seed-keywords.js` so that the demo seeder can bring
 * the index in without shelling out to a second process — two entry points, one
 * implementation. The behaviour is unchanged, and deliberately so: the script's
 * `--fresh` semantics are what editors rely on, and the demo seeder calls
 * through here rather than growing a second, subtly different copy.
 *
 * Written to be re-runnable, which is the property that matters: an editor
 * correcting a Shahmukhi label or adding a source should be able to run this
 * again and have the correction appear, rather than having to hand-edit a
 * database. `fresh` discards the entries this file owns first, for the case
 * where a key has been renamed or removed and the old one would otherwise
 * linger.
 *
 * What it deliberately does NOT do is touch entries it did not create. A
 * keyword an editor added through the API is not in this file, so the seeder
 * has no opinion about it and leaves it alone — a seeder that wiped everything
 * would make its own second run destructive.
 *
 * The related-links are resolved in a second pass, after every entry exists.
 * They are stored as ObjectIds, so a forward reference to a keyword that has
 * not been inserted yet cannot be resolved inline.
 */

/**
 * The keys this file owns, which is what `fresh` is allowed to delete.
 *
 * Bounded to this list rather than "everything", so a `--fresh` run cannot
 * empty a cultural index that editors have spent months building. The gap it
 * leaves is real and worth knowing: a keyword an editor created through the API
 * under a key that also appears in this file counts as owned by this file, and
 * `--fresh` will remove it. That is the price of not stamping every document
 * with its origin, and the seed list is short enough that the collision is
 * unlikely and visible when it happens.
 */
export const SEEDED_KEYWORD_KEYS = Object.freeze(SEED_KEYWORDS.map((entry) => entry.key));

/**
 * Reads what a run would do without doing it.
 *
 * Only the head-line counts, because those are what a --dry-run is looked at
 * for. Reporting the per-entry diff would be more precise and less useful: the
 * answer to "is this going to surprise me" is the number of keys that do not
 * exist yet, and whether `fresh` is about to remove anything.
 */
export async function planKeywordSeed({ fresh = false } = {}) {
  const existing = await Keyword.find(
    { key: { $in: [...SEEDED_KEYWORD_KEYS] } },
    'key',
  ).lean();

  const present = new Set(existing.map((row) => row.key));

  return {
    total: SEED_KEYWORDS.length,
    create: SEED_KEYWORDS.filter((entry) => !present.has(entry.key)).length,
    update: SEED_KEYWORDS.filter((entry) => present.has(entry.key)).length,
    remove: fresh ? present.size : 0,
  };
}

export async function seedKeywords({ fresh = false } = {}) {
  if (fresh) {
    const result = await Keyword.deleteMany({ key: { $in: [...SEEDED_KEYWORD_KEYS] } });
    logger.info({ removed: result.deletedCount }, 'Removed previously seeded keywords');
  }

  let created = 0;
  let updated = 0;

  for (const entry of SEED_KEYWORDS) {
    const { key, related = [], ...fields } = entry;

    const existing = await Keyword.findOne({ key });

    if (existing) {
      // Note what is NOT overwritten: `storyCount`. It is maintained by the
      // story service and reflects real usage, so a re-seed must not reset it
      // to zero — that would make a keyword with a hundred stories behind it
      // drop out of every popularity ordering until the next rebuild.
      Object.assign(existing, fields);
      await existing.save();
      updated += 1;
    } else {
      await Keyword.create({ key, ...fields, isCurated: true });
      created += 1;
    }
  }

  // Second pass: the entries all exist now, so keys can be resolved to ids.
  let linked = 0;
  const missing = [];

  for (const entry of SEED_KEYWORDS) {
    if (!entry.related?.length) continue;

    const related = await Keyword.find({ key: { $in: entry.related } }, '_id key').lean();

    if (related.length !== entry.related.length) {
      const found = new Set(related.map((row) => row.key));
      const absent = entry.related.filter((key) => !found.has(key));

      // Reported rather than thrown. A missing related key is a typo in this
      // file, not a reason to abandon a run that has already written everything
      // else — and saying which key is missing is more useful than a failure.
      logger.warn({ keyword: entry.key, missing: absent }, 'Related keyword not found');
      missing.push({ keyword: entry.key, missing: absent });
    }

    await Keyword.updateOne(
      { key: entry.key },
      { $set: { related: related.map((row) => row._id) } },
    );

    linked += related.length;
  }

  const report = { total: SEED_KEYWORDS.length, created, updated, linked, missing, fresh };

  logger.info(
    { total: report.total, created, updated, links: linked, fresh },
    'Keyword seed complete',
  );

  return report;
}

export default { seedKeywords, planKeywordSeed, SEEDED_KEYWORD_KEYS };
