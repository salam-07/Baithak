import { User, Story, Like, Interest, RefreshToken } from '../models/index.js';
import { DEMO_LIKES, DEMO_PASSWORD, DEMO_STORIES, DEMO_USERS } from '../data/seedDemo.js';
import { STORY_STATUS } from '../config/constants.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';
import { createStory, updateStory, deleteStory, likeStory } from './story.service.js';
import { seedKeywords, planKeywordSeed } from './keyword-seed.service.js';



export const DEMO_SCOPES = Object.freeze(['keywords', 'users', 'stories', 'likes']);

/**
 * What a run would do, without doing any of it.
 *
 * Deliberately written as a separate read-only pass rather than by threading a
 * `dryRun` flag through the writer. A writer that conditionally skips its own
 * writes has to be trusted to skip *all* of them, and the interesting thing to
 * report — how many of these already exist — is a query either way.
 */
export async function planDemoSeed({ fresh = false, only } = {}) {
  const scopes = new Set(only?.length ? only : DEMO_SCOPES);

  const users = await User.find(
    { username: { $in: DEMO_USERS.map((row) => row.username) } },
    'username',
  ).lean();
  const existingUsers = new Set(users.map((row) => row.username));

  const authorIds = users.map((row) => row._id);

  // Matched the same way the writer will, so the two cannot disagree about
  // whether a story already exists.
  const stories = authorIds.length
    ? await Story.find({ author: { $in: authorIds } }, 'author texts').lean()
    : [];

  let existingStories = 0;
  for (const story of DEMO_STORIES) {
    const author = users.find((row) => row.username === story.author);
    if (!author) continue;

    const title = originalTitle(story);
    if (stories.some((row) => String(row.author) === String(author._id)
      && row.texts?.some((text) => text.isOriginal && text.title === title))) {
      existingStories += 1;
    }
  }

  const existingUserCount = existingUsers.size;
  const removedStories = fresh && authorIds.length
    ? await Story.countDocuments({ author: { $in: authorIds } })
    : 0;

  return {
    dryRun: true,
    scopes: [...scopes],
    fresh,
    keywords: scopes.has('keywords') ? await planKeywordSeed({ fresh: false }) : null,
    users: {
      total: DEMO_USERS.length,
      existing: existingUserCount,
      create: DEMO_USERS.length - existingUserCount,
    },
    stories: {
      total: DEMO_STORIES.length,
      existing: existingStories,
      create: DEMO_STORIES.length - existingStories,
      remove: removedStories,
    },
    likes: {
      total: Object.values(DEMO_LIKES).reduce((sum, list) => sum + list.length, 0),
    },
  };
}

/**
 * The identity a story is matched on.
 *
 * The title of the variant marked `isOriginal`, which is the one part of a
 * seeded story that a person is unlikely to edit by accident. Documented
 * limitation: renaming that title in `seedDemo.js` makes the next run create a
 * second story rather than renaming the first, and the old one has to be cleared
 * with `--fresh`. Matching on a hash of the body instead would break the moment
 * somebody corrected a typo in the prose, which is the more common edit.
 */
function originalTitle(story) {
  return story.texts.find((text) => text.isOriginal)?.title ?? story.texts[0].title;
}

/**
 * Creates the accounts, or brings existing ones back to the documented state.
 *
 * The password is reset on every run rather than only on creation, which is a
 * choice worth naming: it means the password in BACKEND.md is always correct,
 * which is the property a demo needs, and it means an account whose password
 * somebody changed by hand is silently put back. For demo accounts on a demo
 * database that is the right trade; it would be indefensible anywhere else.
 */
async function seedUsers() {
  let created = 0;
  let updated = 0;

  for (const spec of DEMO_USERS) {
    const existing = await User.findOne({ username: spec.username });

    const user = existing ?? new User({ username: spec.username });

    user.name = spec.name;
    user.bio = spec.bio;
    user.role = spec.role;
    user.location = spec.location;
    user.status = 'active';
    user.onboardingCompleted = true;

    await user.setPassword(DEMO_PASSWORD, env.bcryptRounds);
    await user.save();

    if (existing) updated += 1;
    else created += 1;
  }

  return { created, updated };
}


async function clearDemoData() {
  const users = await User.find({ username: { $in: DEMO_USERS.map((row) => row.username) } });
  const ids = users.map((row) => row._id);

  if (ids.length === 0) return { stories: 0, users: 0, likes: 0, interests: 0 };

  const stories = await Story.find({ author: { $in: ids } }, '_id').lean();

  // Sequentially, because `deleteStory` writes counters per story and firing
  // twenty of them at once would contend on the same keyword documents for no
  // gain on a corpus this size.
  for (const story of stories) {
    // `userId` is null because `isAdmin` already satisfies the ownership check —
    // leaving a real id here would suggest the owner mattered.
    await deleteStory({ storyId: story._id, userId: null, isAdmin: true });
  }

  // A demo account may have appreciated something it did not write; the stories
  // above took their own likes with them, and this catches the rest.
  const [likes, interests, tokens] = await Promise.all([
    Like.deleteMany({ user: { $in: ids } }),
    // The affinity profile these accounts built is derived data, so it goes with
    // them rather than being left to point at deleted keywords.
    Interest.deleteMany({ user: { $in: ids } }),
    RefreshToken.deleteMany({ user: { $in: ids } }),
  ]);

  await User.deleteMany({ _id: { $in: ids } });

  return {
    stories: stories.length,
    users: ids.length,
    likes: likes.deletedCount,
    interests: interests.deletedCount,
    tokens: tokens.deletedCount,
  };
}

/**
 * Creates or updates one story, and then puts its publication date where the
 * data file says it should be.
 *
 * The second step is a targeted update and it is safe because `publishedAt` is
 * not a counter — nothing accumulates on it, and no other document caches it.
 * It is applied after the service call rather than passed into it because
 * `createStory` deliberately has no way to accept a date: only a story actually
 * being published gets one, and letting a caller supply an arbitrary value is
 * exactly the hole that rule closes.
 *
 * It is re-anchored on every run, so the corpus stays inside the seven-day
 * window that "popular this week" scans. That means a second run is not a
 * perfect no-op — it moves these timestamps — and it is the one thing it
 * deliberately changes. `--fresh` is not required to fix it, and after a week of
 * not running this the corpus would otherwise be invisible to every ranked feed.
 */
async function seedStory({ spec, authorId }) {
  const title = originalTitle(spec);
  const existing = await Story.findOne({
    author: authorId,
    texts: { $elemMatch: { isOriginal: true, title } },
  });

  let story;

  if (existing) {
    story = await updateStory({
      storyId: existing._id,
      userId: authorId,
      updates: { texts: spec.texts, status: spec.status },
    });
  } else {
    story = await createStory({
      authorId,
      texts: spec.texts,
      status: spec.status,
    });
  }

  const offset = spec.publishedHoursAgo;
  const shouldPublish = spec.status === STORY_STATUS.PUBLISHED && Number.isFinite(offset);

  if (shouldPublish) {
    const publishedAt = new Date(Date.now() - offset * 3_600_000);
    // `timestamps: false` so this does not read as an edit; the story's
    // `updatedAt` should reflect the writing, not the scheduling.
    await Story.updateOne({ _id: story._id }, { $set: { publishedAt } }, { timestamps: false });
    story.publishedAt = publishedAt;
  } else if (story.publishedAt) {
    // A story the data file has moved back to draft keeps the date it was
    // published on otherwise, which would sort a draft among published work in
    // the author's own listing.
    await Story.updateOne({ _id: story._id }, { $set: { publishedAt: null } }, { timestamps: false });
    story.publishedAt = null;
  }

  return { action: existing ? 'update' : 'create', story };
}

/**
 * Applies the appreciations.
 *
 * `likeStory` is already idempotent — the unique index on (user, story) is what
 * makes it so — which means this needs no existence check of its own. A second
 * run re-inserts nothing and moves no counter.
 */
async function seedLikes() {
  // Scoped to the demo authors, so a story somebody else wrote that happens to
  // share a title cannot be picked up as the target of a seeded appreciation.
  const demoAuthors = await User.find(
    { username: { $in: DEMO_USERS.map((row) => row.username) } },
    '_id username',
  ).lean();
  const authorIds = demoAuthors.map((row) => row._id);

  const stories = authorIds.length
    ? await Story.find({ author: { $in: authorIds } }, 'author texts').lean()
    : [];

  const likers = new Map(
    (await User.find({ username: { $in: Object.values(DEMO_LIKES).flat() } }, '_id username').lean())
      .map((row) => [row.username, row._id]),
  );

  let applied = 0;
  let skipped = 0;

  for (const [ref, usernames] of Object.entries(DEMO_LIKES)) {
    const spec = DEMO_STORIES.find((row) => row.ref === ref);

    if (!spec) {
      // A typo in DEMO_LIKES is worth saying out loud rather than counting as
      // zero likes against a story that does not exist.
      logger.warn({ ref }, 'DEMO_LIKES names a story that is not in DEMO_STORIES');
      continue;
    }

    const title = originalTitle(spec);
    const story = stories.find((row) => row.texts.some((text) => text.isOriginal && text.title === title));

    if (!story) {
      logger.warn({ ref, title }, 'Liked story not found; was the stories scope skipped?');
      continue;
    }

    for (const username of usernames) {
      const userId = likers.get(username);

      if (!userId) {
        logger.warn({ username, ref }, 'Liker account not found');
        continue;
      }

      if (String(userId) === String(story.author)) {
        // The data file is supposed to avoid this; if it slips, the seeder says
        // so rather than quietly giving an author an appreciation of their own
        // work.
        logger.warn({ username, ref }, 'Author listed as a liker of their own story');
        skipped += 1;
        continue;
      }

      await likeStory({ storyId: story._id, userId });
      applied += 1;
    }
  }

  return { applied, skipped };
}

export async function seedDemo({ fresh = false, only, dryRun = false } = {}) {
  const scopes = new Set(only?.length ? only : DEMO_SCOPES);

  const unknown = [...scopes].filter((scope) => !DEMO_SCOPES.includes(scope));
  if (unknown.length) {
    throw new Error(`Unknown scope(s): ${unknown.join(', ')}. Valid scopes are ${DEMO_SCOPES.join(', ')}.`);
  }

  if (dryRun) return planDemoSeed({ fresh, only: [...scopes] });

  const report = { fresh, scopes: [...scopes], cleared: null, keywords: null, users: null, stories: null, likes: null };

  if (fresh) {
    report.cleared = await clearDemoData();
    logger.info(report.cleared, 'Cleared the previous demo corpus');
  }

  // First, because story keyword extraction reads the index on save. Seeding
  // stories against an empty index would attach nothing and leave every
  // `Keyword.storyCount` at zero, which is the failure this order prevents.
  if (scopes.has('keywords')) {
    report.keywords = await seedKeywords({ fresh: false });
  }

  // The accounts the scripts act as. When `users` is out of scope they have to
  // already exist, and a missing one is a clear error rather than a corpus
  // half-written against the wrong author.
  if (!scopes.has('users')) {
    for (const spec of DEMO_USERS) {
      const exists = await User.exists({ username: spec.username });

      if (!exists) {
        throw new Error(
          `Account ${spec.username} does not exist and the "users" scope was skipped. `
          + 'Run without --only, or include users.',
        );
      }
    }
  }

  if (scopes.has('users')) {
    const result = await seedUsers();
    report.users = { created: result.created, updated: result.updated };
  }

  if (scopes.has('stories')) {
    // Re-read, because `seedUsers` may have just created them.
    const authors = new Map();
    for (const spec of DEMO_USERS) {
      const user = await User.findOne({ username: spec.username }, '_id');
      if (!user) throw new Error(`Account ${spec.username} is missing; the stories scope needs it.`);
      authors.set(spec.username, user._id);
    }

    let created = 0;
    let updated = 0;

    for (const spec of DEMO_STORIES) {
      const { action } = await seedStory({ spec, authorId: authors.get(spec.author) });
      if (action === 'create') created += 1;
      else updated += 1;
    }

    report.stories = { created, updated, total: DEMO_STORIES.length };
  }

  if (scopes.has('likes')) {
    report.likes = await seedLikes();
  }

  logger.info({ report }, 'Demo seed complete');

  return report;
}

export default { seedDemo, planDemoSeed, DEMO_SCOPES };
