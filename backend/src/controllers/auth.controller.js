import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import * as authService from '../services/auth.service.js';

/**
 * The HTTP half of authentication.
 *
 * Every function here does the same three things and stops: read what the
 * validator already parsed, hand it to the service, put the result in the
 * envelope. There is no querying, no password handling, and no decision about
 * what a session is — all of that is in the service, which is what makes it
 * possible to test the auth rules without an HTTP server.
 */

/**
 * Request metadata that the session store keeps.
 *
 * Recorded on the refresh token family so that a reader can eventually be shown
 * where they are signed in, and so that an unusual one is visible when
 * investigating a compromise. Both are truncated inside the token service; the
 * values come from headers, which are attacker-controlled strings of unbounded
 * length.
 */
function sessionContext(req) {
  return {
    userAgent: req.get('user-agent'),
    ip: req.ip,
  };
}

export const signup = asyncHandler(async (req, res) => {
  const { name, username, password, location, interests } = req.body;

  const session = await authService.signup({
    name,
    username,
    password,
    location,
    interests,
    ...sessionContext(req),
  });

  return sendCreated(res, session);
});

export const login = asyncHandler(async (req, res) => {
  const session = await authService.login({
    ...req.body,
    ...sessionContext(req),
  });

  return sendSuccess(res, session);
});

export const refresh = asyncHandler(async (req, res) => {
  const session = await authService.refresh({
    refreshToken: req.body.refreshToken,
    ...sessionContext(req),
  });

  return sendSuccess(res, session);
});

/**
 * Always a success, including for a token that was never valid.
 *
 * Reporting "that token did not exist" would turn this route into a way of
 * testing whether a captured string is a live session — which is precisely the
 * question an attacker holding one wants answered.
 */
export const logout = asyncHandler(async (req, res) => {
  const result = await authService.logout({ refreshToken: req.body.refreshToken });
  return sendSuccess(res, result);
});

/**
 * The signed-in reader's own profile.
 *
 * Read straight off `req.user`, which `requireAuth` already loaded with the
 * fields `toPrivateProfile` needs. Re-reading it here would be a second query
 * for a document this request is already holding.
 */
export const me = asyncHandler(async (req, res) => sendSuccess(res, req.user.toPrivateProfile()));

export default { signup, login, refresh, logout, me };
