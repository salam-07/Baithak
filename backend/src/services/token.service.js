import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { RefreshToken } from '../models/index.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * Access tokens and rotating refresh tokens.
 *
 * The split exists because the two have opposite requirements. An access token
 * is checked on every request, so it must be verifiable without a database
 * read — which means it cannot be revoked. A refresh token is exchanged rarely,
 * so it can afford a database round trip, and that is what makes it revocable.
 * Putting the revocable one in the short-lived slot and the stateless one in
 * the long-lived slot is the whole design.
 */

const ACCESS_TOKEN_TYPE = 'access';

/**
 * Parses a duration the way jsonwebtoken does, because the value has to be
 * understood twice: jsonwebtoken applies it to the signed `exp` claim, and the
 * refresh token's `expiresAt` has to be computed here so the TTL index and the
 * application-level expiry check agree with the token itself.
 *
 * If these two ever disagreed, the failure would be subtle: a token that
 * jsonwebtoken considers valid but this code considers expired (or the reverse)
 * produces an intermittent logout that is very hard to reproduce.
 */
export function parseDuration(value) {
  if (typeof value === 'number') return value * 1000;

  const match = /^(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w|y)?$/i.exec(String(value ?? '').trim());
  if (!match) throw new Error(`Cannot parse duration: ${value}`);

  const amount = Number(match[1]);
  const unit = (match[2] ?? 'ms').toLowerCase();

  const multipliers = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

export function signAccessToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      username: user.username,
      role: user.role,
      // Distinguishes an access token from a refresh token in the payload as
      // well as by signature. When the two secrets are the same — which is the
      // documented fallback — this claim is the only thing preventing a refresh
      // token from being accepted as an access token.
      typ: ACCESS_TOKEN_TYPE,
    },
    env.jwt.secret,
    { expiresIn: env.jwt.accessTtl, issuer: 'baithak' },
  );
}

/**
 * Verifies an access token and returns its payload.
 *
 * `algorithms` is pinned. Without it, jsonwebtoken would honour the algorithm
 * named in the token's own header, and the classic attack against that is to
 * present a token signed with `none`, or an HS256 token signed with the public
 * key of an RS256 pair. Naming the permitted algorithm closes both.
 */
export function verifyAccessToken(token) {
  let payload;

  try {
    payload = jwt.verify(token, env.jwt.secret, {
      algorithms: ['HS256'],
      issuer: 'baithak',
    });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new ApiError(401, 'TOKEN_EXPIRED', 'Your session has expired.');
    }
    throw ApiError.unauthorized('Your session is not valid.');
  }

  // A refresh token presented as an access token should be rejected even if it
  // happens to verify, which it will when both secrets are the same value.
  if (payload.typ !== ACCESS_TOKEN_TYPE) {
    throw ApiError.unauthorized('Your session is not valid.');
  }

  return payload;
}

/**
 * Refresh tokens are opaque random bytes rather than JWTs.
 *
 * A JWT would be self-describing and let a lookup start from its own payload,
 * but it would also carry the user id in a value the client holds, and it could
 * not be revoked without the same database lookup this already does. Opaque
 * bytes carry nothing, are trivially revocable, and there is no signing key to
 * get wrong. 48 bytes is well past the point where guessing is a concern.
 */
function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Issues a refresh token, starting a new family when none is given.
 *
 * The family id is random rather than derived from the user or the token, so
 * that it is not a stable identifier a client could predict or correlate.
 */
export async function issueRefreshToken({ user, family, userAgent, ip } = {}) {
  const token = generateRefreshToken();
  const expiresAt = new Date(Date.now() + parseDuration(env.jwt.refreshTtl));

  await RefreshToken.create({
    user: user._id ?? user,
    tokenHash: hashToken(token),
    family: family ?? crypto.randomUUID(),
    expiresAt,
    userAgent: userAgent?.slice(0, 400),
    ip: ip?.slice(0, 60),
  });

  return { token, expiresAt, family };
}

/**
 * Exchanges a refresh token for a new pair, rotating the old one out.
 *
 * The reuse detection here is the reason this is not simply a verify-and-issue.
 * A refresh token is single-use: presenting a valid one revokes it and issues a
 * replacement. If a token that has already been rotated is presented again,
 * either the client retried or the token was stolen, and there is no way to
 * tell which from here.
 *
 * The response is to revoke the entire family. That signs out the legitimate
 * reader along with the attacker, which is annoying and correct — the
 * alternative is letting a captured token work indefinitely, since the real
 * user's continued use keeps minting successors that the attacker can ride.
 * A false positive costs one sign-in; a false negative costs the account.
 */
export async function rotateRefreshToken({ token, userAgent, ip } = {}) {
  if (!token) throw ApiError.unauthorized('A refresh token is required.');

  const tokenHash = hashToken(token);
  const existing = await RefreshToken.findOne({ tokenHash });

  if (!existing) {
    // Unknown to us. Either forged, or from an environment whose database was
    // reset. Nothing to revoke, so this is a plain rejection.
    throw ApiError.unauthorized('Your session is not valid.');
  }

  if (existing.revokedAt || existing.replacedByHash) {
    // The reuse case. Revoking the family is the whole point of keeping the
    // replaced token around rather than deleting it on rotation.
    logger.warn(
      { userId: String(existing.user), family: existing.family },
      'Refresh token reuse detected; revoking family',
    );

    await revokeFamily(existing.family);

    throw new ApiError(401, 'REFRESH_REUSE_DETECTED', 'Your session was ended for security. Please sign in again.');
  }

  // Checked in application code and not left to the TTL index, which runs on a
  // background sweep roughly once a minute. In that window an expired token
  // would otherwise still be honoured.
  if (existing.expiresAt <= new Date()) {
    throw ApiError.unauthorized('Your session has expired.');
  }

  const issued = await issueRefreshToken({
    user: existing.user,
    family: existing.family,
    userAgent,
    ip,
  });

  await RefreshToken.updateOne(
    { _id: existing._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedByHash: hashToken(issued.token) } },
  );

  return { ...issued, user: existing.user };
}

/** Revokes one token. Used by logout. */
export async function revokeRefreshToken(token) {
  if (!token) return { revoked: false };

  // Deliberately does not distinguish "revoked" from "never existed" in its
  // result, and the caller must not either: telling a caller that a given
  // token exists would turn logout into an oracle for whether a token is real.
  const result = await RefreshToken.updateOne(
    { tokenHash: hashToken(token), revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { revoked: result.modifiedCount > 0 };
}

/** Revokes every token descended from one sign-in. */
export async function revokeFamily(family) {
  if (!family) return { revoked: 0 };

  const result = await RefreshToken.updateMany(
    { family, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { revoked: result.modifiedCount };
}

/** Revokes every session for a reader, across all devices. */
export async function revokeAllForUser(userId) {
  const result = await RefreshToken.updateMany(
    { user: userId, revokedAt: null },
    { $set: { revokedAt: new Date() } },
  );

  return { revoked: result.modifiedCount };
}

export default {
  parseDuration,
  signAccessToken,
  verifyAccessToken,
  hashToken,
  issueRefreshToken,
  rotateRefreshToken,
  revokeRefreshToken,
  revokeFamily,
  revokeAllForUser,
};
