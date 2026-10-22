import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import { canModerate } from '../middlewares/auth.js';
import * as storyService from '../services/story.service.js';

/**
 * The HTTP half of stories.
 *
 * Two conventions hold across all of these.
 *
 * `viewerId` comes from `req.auth`, which `optionalAuth` fills in on the public
 * reads. It is passed to the service so a card can say whether this reader has
 * already appreciated a story — and it is optional everywhere, which is what
 * lets the same endpoint serve anonymous browsing and a signed-in reader
 * without a second code path.
 *
 * `isAdmin` is derived from the loaded user rather than from the token's role
 * claim. A claim is a snapshot from sign-in, and a role revoked an hour ago
 * would still be trusted here until the token expired.
 */

/** The listing filters, as the validator produced them. */
function listingFilters(query) {
  const { keyword, language, author, search, curated } = query;
  return { keyword, language, author, search, curated };
}

export const createStory = asyncHandler(async (req, res) => {
  const { texts, status } = req.body;

  const story = await storyService.createStory({
    authorId: req.auth.userId,
    texts,
    status,
  });

  return sendCreated(res, story);
});

export const listStories = asyncHandler(async (req, res) => {
  const { items, meta } = await storyService.listStories({
    filters: listingFilters(req.query),
    cursor: req.query.cursor,
    limit: req.query.limit,
    // Absent on every caller but the feed, which is what keeps this endpoint's
    // default order — and everything built on it, like Explore — unchanged.
    seed: req.query.seed,
    viewerId: req.auth?.userId,
  });

  return sendSuccess(res, items, { meta });
});

export const getStory = asyncHandler(async (req, res) => {
  const story = await storyService.getStory({
    storyId: req.params.storyId,
    viewerId: req.auth?.userId,
    isAdmin: canModerate(req),
  });

  return sendSuccess(res, story);
});

export const updateStory = asyncHandler(async (req, res) => {
  const story = await storyService.updateStory({
    storyId: req.params.storyId,
    userId: req.auth.userId,
    updates: req.body,
    isAdmin: canModerate(req),
  });

  return sendSuccess(res, story);
});

/**
 * A hard delete, and a 200 rather than a 204.
 *
 * The body carries what was removed — the story and how many appreciations went
 * with it — because a reader deleting their own writing has a reasonable
 * interest in knowing it is actually gone rather than hidden.
 */
export const deleteStory = asyncHandler(async (req, res) => {
  const result = await storyService.deleteStory({
    storyId: req.params.storyId,
    userId: req.auth.userId,
    isAdmin: canModerate(req),
  });

  return sendSuccess(res, result);
});

export const likeStory = asyncHandler(async (req, res) => {
  const result = await storyService.likeStory({
    storyId: req.params.storyId,
    userId: req.auth.userId,
  });

  return sendSuccess(res, result);
});

export const unlikeStory = asyncHandler(async (req, res) => {
  const result = await storyService.unlikeStory({
    storyId: req.params.storyId,
    userId: req.auth.userId,
  });

  return sendSuccess(res, result);
});

/**
 * An author's own stories, drafts included.
 *
 * Owner-scoped, and the service enforces that rather than trusting the route:
 * `authorId` is always the caller's own id, never one taken from the request.
 * A route that listed somebody else's drafts would expose work they have not
 * published, which is the one thing an author expects to control.
 */
export const listOwnStories = asyncHandler(async (req, res) => {
  const { items, meta } = await storyService.listStoriesByAuthor({
    authorId: req.auth.userId,
    cursor: req.query.cursor,
    limit: req.query.limit,
  });

  return sendSuccess(res, items, { meta });
});

export default {
  createStory,
  listStories,
  getStory,
  updateStory,
  deleteStory,
  likeStory,
  unlikeStory,
  listOwnStories,
};
