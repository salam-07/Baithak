import { Router } from 'express';

import validate from '../middlewares/validate.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import * as feedController from '../controllers/feed.controller.js';
import { forYouQuerySchema, popularQuerySchema } from '../validators/feed.validator.js';

/**
 * Discovery.
 *
 * The asymmetry in authentication is the design, not an inconsistency. `for-you`
 * requires a reader because it ranks by their interests and has nothing to rank
 * for an anonymous caller — a 401 says that plainly, whereas returning the
 * newest stories to someone who asked for personalisation would be a quiet lie.
 * `popular` is a fact about the corpus and is the same for everybody, so it is
 * public.
 *
 * Neither of these is the default feed. `GET /stories` is newest-first — or
 * shuffled by `?seed=`, which is a deal and not a ranking — and is never
 * reordered by either — see feed.service.js for why that separation is the point
 * rather than an implementation detail.
 */

const router = Router();

router.get('/for-you', requireAuth, validate({ query: forYouQuerySchema }), feedController.forYou);

router.get('/popular', optionalAuth, validate({ query: popularQuerySchema }), feedController.popular);

export default router;
