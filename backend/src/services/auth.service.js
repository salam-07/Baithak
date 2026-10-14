import { User, Interest } from '../models/index.js';
import { USER_STATUS, INTEREST_KINDS } from '../config/constants.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { normalizeText } from '../utils/normalize.js';
import {
  signAccessToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
} from './token.service.js';
import { touchLastActive } from './user.service.js';

/**
 * Sign-up, sign-in, and session lifecycle.
 *
 * The product decision this implements, from your brief: a reader chooses their
 * own username and password, then adds a name and optional location in onboarding. That is a
 * password-based account, which differs from the "simple passwordless
 * onboarding" PRODUCT.md proposes — your brief takes precedence, and the
 * divergence is recorded in BACKEND.md rather than left to be discovered.
 *
 * What the divergence costs is worth naming, since PRODUCT.md raises it: an
 * account here is a username and a password with no verified contact, so
 * entering a name does not establish ownership of it, and there is no account
 * recovery. Both need deciding before this is public.
 */

/** The shape returned on a successful sign-in or refresh. */
function buildSession({ user, accessToken, refreshToken, refreshExpiresAt }) {
  return {
    user: user.toPrivateProfile ? user.toPrivateProfile() : user,
    tokens: {
      accessToken,
      // Sent to the client as a body field rather than a cookie. That is a
      // deliberate choice for this stack: the frontend is a separate Vite app
      // on a different origin in development, where a cross-site cookie needs
      // SameSite=None plus HTTPS to work at all. A body token keeps that simple,
      // at the cost of the client having to store it safely — see BACKEND.md
      // for the trade and what the client is expected to do about it.
      refreshToken,
      tokenType: 'Bearer',
      refreshExpiresAt,
    },
  };
}

/**
 * Creates an account.
 *
 * Duplicate usernames are detected by the unique index, not by a check before
 * the insert. The check is there only so the common case gets a clean 409
 * instead of a raw driver error; the index is what actually makes it correct,
 * since two simultaneous signups for the same name would both pass a
 * check-then-insert and one of them has to fail somewhere.
 */
export async function signup({
  name,
  username,
  password,
  location,
  interests,
  userAgent,
  ip,
} = {}) {
  const normalizedUsername = String(username).trim().toLowerCase();

  const existing = await User.findOne({ username: normalizedUsername }, '_id').lean();
  if (existing) {
    throw ApiError.conflict('That username is taken. Please choose another.');
  }

  const user = new User({
    name: name?.trim() || normalizedUsername,
    onboardingCompleted: Boolean(name?.trim()),
    username: normalizedUsername,
    // Absent rather than empty, so "no location given" is distinguishable from
    // "location given as an empty string" — which matters for whether the
    // profile screen shows a field at all.
    ...(location ? { location: location.trim() } : {}),
  });

  await user.setPassword(password, env.bcryptRounds);

  try {
    await user.save();
  } catch (error) {
    if (error?.code === 11000) {
      throw ApiError.conflict('That username is taken. Please choose another.');
    }
    throw error;
  }

  // Optional at sign-up, and worth having: a brand new account has no likes, so
  // without this the "for you" feed has nothing to work with and falls back to
  // moment they are most willing to, and it is the same interest store the rest
  // of the system uses rather than a separate onboarding field.
  if (Array.isArray(interests) && interests.length > 0) {
    await seedInterests(user._id, interests);
  }

  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken({ user, userAgent, ip });

  logger.info({ userId: String(user._id) }, 'Account created');

  return buildSession({
    user,
    accessToken,
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  });
}

/**
 * Writes the interests chosen at sign-up.
 *
 * Given weight 1 rather than the manual weight, because at this point the
 * reader has not actually read anything — they have picked from a list of
 * suggestions. Treating an onboarding tap as equivalent to a deliberate search
 * and manual add weeks later would let a hurried choice dominate the feed.
 */
async function seedInterests(userId, interests) {
  const operations = [];

  for (const interest of interests.slice(0, 30)) {
    const kind = interest?.kind;
    const ref = normalizeText(interest?.ref ?? interest?.label ?? '');

    if (!kind || !ref) continue;
    if (!INTEREST_KINDS.includes(kind)) continue;

    operations.push({
      updateOne: {
        filter: { user: userId, kind, ref },
        update: {
          $set: { label: interest.label ?? ref, lastSignalAt: new Date() },
          $setOnInsert: { user: userId, kind, ref, source: 'like', blocked: false, weight: 1 },
        },
        upsert: true,
      },
    });
  }

  if (operations.length === 0) return;

  try {
    await Interest.bulkWrite(operations, { ordered: false });
  } catch (error) {
    // Not fatal to sign-up. The account exists and works; the reader can add
    // interests from their profile, and failing the whole registration over a
    // preference list would be a bad trade.
    logger.warn({ err: error, userId: String(userId) }, 'Could not seed sign-up interests');
  }
}

/**
 * Signs a reader in.
 *
 * The failure message is identical whether the username does not exist or the
 * password is wrong, and that matters here more than usual: usernames in this
 * product are names people chose, often close to their real name, so a
 * distinguishable "no such user" turns the login form into a way of
 * enumerating who is on the platform.
 *
 * A suspended account gets its own message, because telling a reader their
 * password is wrong when it is not leaves them with nothing to act on.
 */
export async function login({ username, password, userAgent, ip } = {}) {
  const normalizedUsername = String(username).trim().toLowerCase();

  // The hash is explicitly selected, since the field is `select: false` — which
  // is what keeps it out of every other query in the codebase by default. The
  // location is pulled in too so that the signed-in reader gets the same
  // `toPrivateProfile` shape from sign-in as from a later `GET /auth/me`; a
  // client should not have to treat the login response as a special case.
  const user = await User.findOne({ username: normalizedUsername }).select('+passwordHash +location');

  if (!user) {
    // A dummy comparison against a fixed hash, so that a request for a
    // non-existent username costs roughly the same time as one for an existing
    // username with a wrong password. Without it, the response time alone
    // reveals whether an account exists.
    await User.prototype.verifyPassword.call(
      { passwordHash: DUMMY_BCRYPT_HASH },
      password ?? '',
    );
    throw ApiError.unauthorized('That username or password is not correct.');
  }

  const matches = await user.verifyPassword(password ?? '');

  if (!matches) {
    throw ApiError.unauthorized('That username or password is not correct.');
  }

  if (user.status === USER_STATUS.SUSPENDED) {
    throw new ApiError(403, 'ACCOUNT_SUSPENDED', 'This account is suspended.');
  }

  if (user.status !== USER_STATUS.ACTIVE) {
    throw ApiError.unauthorized('That username or password is not correct.');
  }

  const accessToken = signAccessToken(user);
  const refresh = await issueRefreshToken({ user, userAgent, ip });

  // Fire-and-forget, and deliberately not `user.save()`. Saving the whole
  // document here would write the password hash back on every sign-in for no
  // reason, and would make a concurrent profile edit from another device a
  // lost-update candidate on a document that has nothing to do with this
  // request.
  touchLastActive(user._id);

  logger.info({ userId: String(user._id) }, 'Signed in');

  return buildSession({
    user,
    accessToken,
    refreshToken: refresh.token,
    refreshExpiresAt: refresh.expiresAt,
  });
}

/**
 * A bcrypt hash of a fixed, unguessable-looking string, used only to spend the
 * same CPU time on a missing account as on a wrong password.
 *
 * Generated once from a random value and committed, because it is not a
 * credential — it is a timing prop, and it must not match any password anybody
 * could enter. It is compared against, never authenticated with.
 */
const DUMMY_BCRYPT_HASH = '$2a$12$C6UzMDM.H6dfI/f/IKcEe.9pBqT4Zt5DlkQ0l5N4X8v1lJqK8QKZG';

/**
 * Exchanges a refresh token for a new pair.
 *
 * The user is re-read rather than trusted from the stored token, so that a
 * suspension applied after sign-in takes effect at the next refresh instead of
 * whenever the token happens to expire.
 */
export async function refresh({ refreshToken, userAgent, ip } = {}) {
  const rotated = await rotateRefreshToken({ token: refreshToken, userAgent, ip });

  const user = await User.findById(rotated.user).select('+location');
  if (!user || user.status !== USER_STATUS.ACTIVE) {
    // The rotation already happened, so the new token exists. Revoking it keeps
    // a suspended reader from holding a working session they can no longer use.
    await revokeRefreshToken(rotated.token);
    throw ApiError.unauthorized('Your session is not valid.');
  }

  // A refreshed session is a reader still using the product, and the refresh is
  // already a write to the token collection, so recording activity here costs
  // nothing that is not already being spent.
  touchLastActive(user._id);

  return buildSession({
    user,
    accessToken: signAccessToken(user),
    refreshToken: rotated.token,
    refreshExpiresAt: rotated.expiresAt,
  });
}

/** Ends one session. Idempotent, and never reveals whether the token existed. */
export async function logout({ refreshToken } = {}) {
  await revokeRefreshToken(refreshToken);
  return { signedOut: true };
}

export default {
  signup,
  login,
  refresh,
  logout,
};
