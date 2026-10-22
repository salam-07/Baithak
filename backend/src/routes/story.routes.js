import { z } from 'zod';
import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import { saveStoryKeywords } from '../services/story-keywords.service.js';
import { objectId } from '../validators/common.validator.js';
const storyKeywordSettingsSchema = z.object({ revision: z.number().int().min(1), settings: z.object({ custom: z.array(objectId).max(100), excluded: z.array(objectId).max(100), notes: z.array(z.object({ keyword: objectId, explanation: z.string().trim().max(4000) })).max(100) }) });

import { Router } from 'express';

import validate from '../middlewares/validate.js';
import { requireAuth, optionalAuth, requireRole } from '../middlewares/auth.js';
import { Story } from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import * as storyController from '../controllers/story.controller.js';
import {
  createStorySchema,
  updateStorySchema,
  listStoriesQuerySchema,
  listByAuthorQuerySchema,
  storyIdParamSchema,
} from '../validators/story.validator.js';

/**
 * Stories.
 *
 * The ordering of these registrations is load-bearing, which is worth stating
 * because it is invisible from the route list. Express matches in registration
 * order, so `/mine` has to be declared before `/:storyId` — otherwise a request
 * for the author's own list is read as a request for a story whose id is the
 * literal string "mine", and it fails with a confusing message about an
 * invalid id rather than listing anything.
 *
 * The authentication on each route is chosen per route rather than applied to
 * the whole router. Reading is public; writing requires an account. Applying
 * `requireAuth` to the router and punching holes in it would put the default in
 * the wrong place — a new route added later would be public unless somebody
 * remembered to guard it, which is the failure mode to avoid.
 */

const router = Router();

router.patch('/:storyId/curation', requireAuth, requireRole('editor', 'admin'),
  validate({ params: storyIdParamSchema, body: z.object({ isCurated: z.boolean() }).strict() }),
  asyncHandler(async (req, res) => {
    const story = await Story.findById(req.params.storyId);
    if (!story) throw ApiError.notFound('Story');
    if (req.body.isCurated && story.status !== 'published') throw ApiError.validation('Only published stories can be curated.');
    story.isCurated = req.body.isCurated;
    await story.save();
    return sendSuccess(res, { id: story._id, isCurated: story.isCurated });
  }));

router.put('/:storyId/keywords', requireAuth, validate({ params: storyIdParamSchema, body: storyKeywordSettingsSchema }), asyncHandler(async (req, res) => {
  return sendSuccess(res, await saveStoryKeywords({ storyId: req.params.storyId, userId: req.auth.userId, ...req.body }));
}));

/**
 * The default feed: published stories, newest first — or shuffled, when the
 * client asks for a deal by passing `?seed=`.
 *
 * `optionalAuth` rather than nothing, because a signed-in reader should see
 * which stories they have already appreciated — but the ordering itself is not
 * affected by who is asking. This endpoint is never ranked by affinity; that is
 * `/feed/for-you`, a separate route a client opts into. The distinction is the
 * whole reason the two exist.
 */
router.get(
  '/',
  optionalAuth,
  validate({ query: listStoriesQuerySchema }),
  storyController.listStories,
);

router.post(
  '/',
  requireAuth,
  validate({ body: createStorySchema }),
  storyController.createStory,
);

/** Declared before `/:storyId` — see the note at the top of this file. */
router.get(
  '/mine',
  requireAuth,
  validate({ query: listByAuthorQuerySchema }),
  storyController.listOwnStories,
);

router.get(
  '/:storyId',
  optionalAuth,
  validate({ params: storyIdParamSchema }),
  storyController.getStory,
);

router.patch(
  '/:storyId',
  requireAuth,
  validate({ params: storyIdParamSchema, body: updateStorySchema }),
  storyController.updateStory,
);

router.delete(
  '/:storyId',
  requireAuth,
  validate({ params: storyIdParamSchema }),
  storyController.deleteStory,
);

/**
 * Appreciation as a PUT-shaped pair on a sub-resource.
 *
 * POST and DELETE rather than a single toggle, because a toggle is not
 * idempotent: a dropped response leaves the client unable to know whether it
 * liked the story or unliked it, and a retry flips it back. These two are
 * idempotent — repeating either lands on the same state — so a client can
 * retry safely, which is what makes optimistic UI workable.
 */
router.post(
  '/:storyId/like',
  requireAuth,
  validate({ params: storyIdParamSchema }),
  storyController.likeStory,
);

router.delete(
  '/:storyId/like',
  requireAuth,
  validate({ params: storyIdParamSchema }),
  storyController.unlikeStory,
);

export default router;
