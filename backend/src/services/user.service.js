import { User, Story, Like, Interest, RefreshToken } from '../models/index.js';
import { STORY_STATUS, USER_STATUS } from '../config/constants.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { revokeAllForUser } from './token.service.js';

/**
 * Reader profiles.
 *
 * The recurring decision in this file is what is public. PRODUCT.md asks that
 * what is public be deliberate and explained, and that only participation,
 * continuity and abuse prevention justify collecting anything — so every
 * method here returns the narrowest shape that does the job. `toPublicProfile`
 * is an allowlist, and location is absent from it, because a location narrows
 * a person down sharply in a small community even when it looks harmless.
 */

/** A public profile, plus the counts that make it worth looking at. */
export async function getPublicProfile({ username } = {}) {
  const user = await User.findOne({ username: String(username).toLowerCase() })
    .select('name username bio storyCount createdAt status')
    .lean();

  if (!user) throw ApiError.notFound('Reader');

  // A suspended reader's profile is withheld rather than shown empty, so the
  // interface cannot present a removed account as an ordinary one with no
  // stories. The distinction matters when the reason for suspension is abuse.
  if (user.status !== USER_STATUS.ACTIVE) throw ApiError.notFound('Reader');

  // Recomputed rather than read from the denormalised counter. This is the one
  // place where the true count is worth an extra query: a profile is a claim
  // about a person, and showing a count that has drifted is worse than spending
  // one indexed count on it.
  const publishedStories = await Story.countDocuments({
    author: user._id,
    status: STORY_STATUS.PUBLISHED,
  });

  return {
    // Included so a caller that needs to list this reader's stories can do it
    // without a second lookup by name. The id is already public — it is what
    // `?author=` takes on the story feed and what every card carries as its
    // `author` — so this exposes nothing new, it only saves a round trip.
    id: user._id,
    name: user.name,
    username: user.username,
    bio: user.bio ?? null,
    joinedAt: user.createdAt,
    publishedStories,
  };
}

/**
 * Updates the fields a reader owns.
 *
 * Username is deliberately not editable here. It is the login identifier, and
 * allowing it to change means either sessions that outlive the name they were
 * issued against, or a rename flow with a confirmation step that does not exist
 * yet. Leaving it fixed until that is designed is the smaller problem.
 */
export async function updateProfile({ userId, updates = {} } = {}) {
  const allowed = ['name', 'bio', 'location'];
  const changes = {};

  for (const field of allowed) {
    if (updates[field] !== undefined) changes[field] = updates[field];
  }

  if (Object.keys(changes).length === 0) {
    throw ApiError.badRequest('Nothing to update.');
  }

  // A validated display name completes onboarding in the same atomic write.
  if (typeof changes.name === 'string' && changes.name.trim()) changes.onboardingCompleted = true;

  // `$set` with `runValidators`, rather than load-modify-save, so a concurrent
  // edit cannot be lost by two readers writing the whole document back. The
  // validators still run, which is the part that matters for the length limits.
  const user = await User.findOneAndUpdate(
    { _id: userId, status: USER_STATUS.ACTIVE },
    { $set: changes },
    { new: true, runValidators: true, select: '+location' },
  );

  if (!user) throw ApiError.notFound('Reader');

  return user.toPrivateProfile();
}

/**
 * Changes a password and ends every other session.
 *
 * Revoking all sessions is the point, not a side effect. A password change is
 * often a response to suspecting that somebody else has access, and leaving
 * their refresh tokens valid would make the change cosmetic — they would
 * continue to rotate tokens and stay signed in indefinitely. The reader is
 * signed out everywhere and signs back in, which is a cost worth paying once.
 */
export async function changePassword({ userId, currentPassword, newPassword } = {}) {
  // The hash has to be asked for explicitly, since the field is `select: false`.
  const user = await User.findOne({ _id: userId, status: USER_STATUS.ACTIVE })
    .select('+passwordHash');

  if (!user) throw ApiError.notFound('Reader');

  const matches = await user.verifyPassword(currentPassword);
  if (!matches) {
    // A generic message, and no distinction between "wrong password" and "no
    // such account" — this route is authenticated, so the account is known, but
    // a specific message here would still confirm a guess to somebody holding a
    // stolen access token.
    throw ApiError.unauthorized('That password is not correct.');
  }

  await user.setPassword(newPassword, env.bcryptRounds);
  await user.save();

  const { revoked } = await revokeAllForUser(user._id);

  logger.info({ userId: String(user._id), revokedSessions: revoked }, 'Password changed');

  return { changed: true, revokedSessions: revoked };
}


export async function deleteAccount({ userId, password } = {}) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) throw ApiError.notFound('Reader');

  // Confirmed with the password rather than a flag in the body, because this is
  // irreversible and a stolen access token should not be enough on its own.
  const matches = await user.verifyPassword(password);
  if (!matches) throw ApiError.unauthorized('That password is not correct.');

  const storyIds = await Story.find({ author: user._id }, '_id').lean();

  await User.deleteOne({ _id: user._id });

  const [stories, likes, interests, tokens] = await Promise.all([
    Story.deleteMany({ author: user._id }),
    Like.deleteMany({
      $or: [
        { user: user._id },
        { story: { $in: storyIds.map((row) => row._id) } },
      ],
    }),
    Interest.deleteMany({ user: user._id }),
    RefreshToken.deleteMany({ user: user._id }),
  ]);

  logger.info(
    {
      userId: String(user._id),
      stories: stories.deletedCount,
      likes: likes.deletedCount,
      interests: interests.deletedCount,
      tokens: tokens.deletedCount,
    },
    'Account deleted',
  );

  return {
    deleted: true,
    removed: {
      stories: stories.deletedCount,
      likes: likes.deletedCount,
      interests: interests.deletedCount,
      sessions: tokens.deletedCount,
    },
  };
}

/**
 * Records that a reader was active.
 *
 * Called from the sign-in and refresh paths, which is the honest place for it:
 * those are writes that already happen, so recording activity costs nothing
 * extra. Doing it on every authenticated read instead would double the write
 * load of the service to maintain a field whose only purpose is to let an
 * inactive account be identified later — and PRODUCT.md has not decided what
 * retention policy should apply to that. The data is collected at the points
 * where it is free; nothing reads it yet.
 */
export function touchLastActive(userId) {
  User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date() } }).catch((error) => {
    logger.debug({ err: error, userId: String(userId) }, 'Could not record activity');
  });
}

export default {
  getPublicProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  touchLastActive,
};
