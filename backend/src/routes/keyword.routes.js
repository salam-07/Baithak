import { Router } from 'express';

import validate from '../middlewares/validate.js';
import { requireAuth } from '../middlewares/auth.js';
import * as keywordController from '../controllers/keyword.controller.js';
import {
  listKeywordsQuerySchema,
  keywordKeyParamSchema,
  keywordIdParamSchema,
  resolveKeywordQuerySchema,
  upsertKeywordSchema,
} from '../validators/catalog.validator.js';

/**
 * The cultural index. Public reads, editorial writes.
 *
 * The registration order matters here more than anywhere else in the API,
 * because two literal paths sit under a router that also has a `/:key` pattern:
 *
 *   - `/resolve` has to come before `/:key`, or a lookup of the word "resolve"
 *     is read as a request for a keyword with that key.
 *   - `/id/:keywordId` likewise, for the id-based lookup the interest store
 *     needs — it holds keyword ids, not keys.
 *
 * Express matches in registration order, so both are declared first and the
 * catch-all pattern is last. This is the same hazard as `/mine` in
 * story.routes.js, and it is worth a comment in both places because it is
 * invisible from the route list.
 */

const router = Router();

router.get('/', validate({ query: listKeywordsQuerySchema }), keywordController.listKeywords);

/**
 * Free text to keyword, for the "follow this word" tap in the reading view.
 *
 * A miss is a 200 with `null` rather than a 404 — see the controller. This is
 * also the one public route here that runs a lookup on arbitrary reader input,
 * which is why the text is bounded before it reaches any normalisation.
 */
router.get(
  '/resolve',
  validate({ query: resolveKeywordQuerySchema }),
  keywordController.resolveKeyword,
);

/** Community writes require an active account; no editorial role is required. */
router.post(
  '/',
  requireAuth,
  validate({ body: upsertKeywordSchema }),
  keywordController.upsertKeyword,
);

router.get(
  '/id/:keywordId',
  validate({ params: keywordIdParamSchema }),
  keywordController.getKeywordById,
);

router.get('/:key', validate({ params: keywordKeyParamSchema }), keywordController.getKeyword);

export default router;
