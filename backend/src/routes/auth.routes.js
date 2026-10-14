import { Router } from 'express';

import validate from '../middlewares/validate.js';
import { authLimiter } from '../middlewares/rateLimit.js';
import * as authController from '../controllers/auth.controller.js';
import {
  signupSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from '../validators/auth.validator.js';

/**
 * Session lifecycle, and nothing else.
 *
 * The routes here are about *being* signed in. Everything about the account
 * itself — reading your own profile, changing a password, deleting it — lives
 * under `/users/me`, so there is one place to look for "things that act on my
 * account" and one for "things that act on my session".
 *
 * The rate limiter is on the routes an attacker would use rather than on the
 * whole router, and it is the strict one: these are the four endpoints where
 * guessing is worth something. `skipSuccessfulRequests` means a reader who
 * signs in normally is never counted against it — see the note in
 * middlewares/rateLimit.js.
 */

const router = Router();

router.post('/signup', authLimiter, validate({ body: signupSchema }), authController.signup);

router.post('/login', authLimiter, validate({ body: loginSchema }), authController.login);

/**
 * Not behind `requireAuth`.
 *
 * A client calling this has an expired access token by definition — that is
 * what it is for — so requiring one would make the route unreachable exactly
 * when it is needed. The refresh token in the body is the credential.
 */
router.post('/refresh', authLimiter, validate({ body: refreshSchema }), authController.refresh);

/**
 * Also unauthenticated, and deliberately so.
 *
 * A client whose access token has already expired still holds a refresh token
 * it wants revoked. Requiring a valid access token here would leave that token
 * alive until it expired on its own, which is the opposite of what a logout is
 * for.
 */
router.post('/logout', validate({ body: logoutSchema }), authController.logout);

export default router;
