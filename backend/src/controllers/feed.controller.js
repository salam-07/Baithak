import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import * as feedService from '../services/feed.service.js';



export const forYou = asyncHandler(async (req, res) => {
  const { items, meta } = await feedService.getForYouFeed({
    userId: req.auth.userId,
    cursor: req.query.cursor,
    limit: req.query.limit,
  });

  return sendSuccess(res, items, { meta });
});

/**
 * Public, like the rest of browsing.
 *
 * A signed-in reader gets `viewerHasLiked` on each card; an anonymous one does
 * not. There is no third behaviour and nothing here is personalised, which is
 * why this route does not require a token even though its sibling does — the
 * affinity feed has nothing to rank without a reader, and this has nothing to
 * rank differently with one.
 */
export const popular = asyncHandler(async (req, res) => {
  const { items, meta } = await feedService.getPopularFeed({
    cursor: req.query.cursor,
    limit: req.query.limit,
    viewerId: req.auth?.userId,
  });

  return sendSuccess(res, items, { meta });
});

export default { forYou, popular };
