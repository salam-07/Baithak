import rateLimit from 'express-rate-limit';

import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';

/**
 * Request throttling.
 *
 * The limits are deliberately two-tier rather than uniform. A general ceiling
 * stops a single client from consuming the service, and a much tighter one on
 * the authentication routes stops the specific thing that matters there —
 * credential stuffing, where an attacker tries a list of passwords against a
 * list of usernames. The two need different numbers, because a busy reader
 * scrolling a feed and a script guessing passwords are not the same kind of
 * traffic and a single limit either constrains the first or fails to constrain
 * the second.
 *
 * Both handlers forward an `ApiError` rather than writing a response directly,
 * so a throttled request gets the same error envelope as every other failure. A
 * client then has one shape to parse instead of a special case for 429.
 */

function limitHandler(req, res, next) {
  return next(ApiError.tooManyRequests());
}

/**
 * The general ceiling, applied to the whole API.
 *
 * Keyed on IP by the library's default. That is the right key here and the
 * wrong one in general — a shared connection means several readers behind one
 * address share a budget — but the alternative, keying on the account, is only
 * available after the request has been authenticated, and the unauthenticated
 * traffic is exactly what this is for. `TRUST_PROXY` decides whether the
 * address is the client's or the load balancer's; see the note in env.js.
 *
 * Health checks are excluded by the mount point rather than by a `skip` here:
 * this limiter is mounted at `/api/v1` in app.js and `/health` sits outside it.
 * A `skip` was written first and removed, because it could not have worked —
 * Express strips the mount prefix from `req.path`, so inside this middleware the
 * value is `/auth/login` and never `/health`. A condition that is always false
 * reads as a guarantee, which is worse than the branch not being there.
 */
export const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

/**
 * The authentication ceiling.
 *
 * `skipSuccessfulRequests` is what makes this usable. Counting only failures
 * means a reader signing in on several devices, or a shared phone, is never
 * throttled for doing something legitimate — while guesses, which fail by
 * definition, run into the wall immediately. Without it the limit would have to
 * be loose enough to be useless.
 *
 * The window is longer than the general one because the attack it addresses is
 * sustained rather than bursty: an attacker's cost per guess is near zero, so
 * the only thing that makes guessing impractical is a low ceiling held a long
 * time.
 */
export const authLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  limit: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: limitHandler,
});

export default { apiLimiter, authLimiter };
