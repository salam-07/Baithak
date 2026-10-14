import { User } from '../models/index.js';
import { USER_ROLE, USER_STATUS } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import { verifyAccessToken } from '../services/token.service.js';

/**
 * Who is making this request.
 *
 * Two middlewares rather than one, and the difference between them is a real
 * trade rather than a convenience.
 *
 * `optionalAuth` is for public reads. It decodes the token if one is present and
 * does nothing else — no database read at all — so browsing stays as cheap as
 * it is for an anonymous visitor. The cost is that a token belonging to an
 * account suspended thirty seconds ago is still honoured here for its remaining
 * lifetime. That is acceptable because all this path can influence is whether a
 * card says the reader has already appreciated it; it cannot read or write
 * anything on their behalf.
 *
 * `requireAuth` loads the account. That is one indexed lookup on every
 * authenticated request, which is real, and it buys two things that a stateless
 * check cannot: a suspension takes effect immediately rather than at the next
 * refresh, and a deleted account cannot publish a story under an author id that
 * no longer exists — an orphaned document that nothing would ever notice. Given
 * that this platform has moderation in its future, the read is worth it.
 */

const BEARER_PATTERN = /^Bearer\s+(.+)$/i;

/**
 * Reads a bearer token from the `Authorization` header.
 *
 * The `Bearer` prefix is required rather than optional. Accepting a bare token
 * would work with more clients and would also mean a client that puts the
 * wrong credential in the wrong header gets authenticated instead of told.
 */
function extractToken(req) {
  const header = req.get?.('authorization');
  if (!header) return null;

  const match = BEARER_PATTERN.exec(header.trim());
  return match ? match[1].trim() : null;
}

/**
 * Attaches `req.auth` when a valid token is present. Never rejects.
 *
 * An invalid or expired token on a public route is treated as no token, because
 * the alternative — a 401 on a page that does not require signing in — would
 * break browsing for anyone whose session lapsed while the tab was open.
 */
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    req.auth = {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  } catch {
    // Deliberately swallowed. See the note above.
  }

  return next();
}

/**
 * Rejects anything without a valid token, and attaches `req.user`.
 *
 * The user document is attached rather than only its id because most
 * authenticated routes end up needing some part of it — the owner's own
 * profile, the author id on a new story — and loading it once here is one read
 * instead of one read plus a lookup in every controller that needs a field.
 */
export async function requireAuth(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return next(ApiError.unauthorized('Sign in to continue.'));
  }

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch (error) {
    return next(error);
  }

  try {
    // `+location` because every response built from this document goes through
    // `toPrivateProfile`, which includes it. Selecting it here means the
    // controller never has to know which fields are `select: false`.
    const user = await User.findOne({ _id: payload.sub, status: USER_STATUS.ACTIVE })
      .select('+location');

    if (!user) {
      return next(ApiError.unauthorized('Your session is not valid.'));
    }

    req.user = user;
    req.auth = {
      userId: String(user._id),
      username: user.username,
      role: user.role,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Requires one of the given roles.
 *
 * Mounted after `requireAuth`, and it reads the role from the loaded document
 * rather than from the token. The token carries a role claim for convenience,
 * but a claim is a snapshot from sign-in: an editor demoted an hour ago would
 * still hold a valid token naming them an editor, which is exactly the window
 * this check exists to close.
 */
export function requireRole(...roles) {
  return function requireRoleMiddleware(req, res, next) {
    if (!req.auth) return next(ApiError.unauthorized('Sign in to continue.'));

    if (!roles.includes(req.user?.role ?? req.auth.role)) {
      return next(ApiError.forbidden('You do not have access to this.'));
    }

    return next();
  };
}

/**
 * Whether the caller may act on a document, allowing for editors and admins.
 *
 * Exported as a predicate rather than a middleware because several services
 * already take an `isAdmin` flag, and the decision belongs in one place: two
 * implementations of "is this person allowed to edit this story" is how one of
 * them ends up wrong.
 */
export function canModerate(req) {
  return req.user?.role === USER_ROLE.ADMIN || req.user?.role === USER_ROLE.EDITOR;
}

export { extractToken };
