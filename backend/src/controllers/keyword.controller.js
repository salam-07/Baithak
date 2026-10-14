import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import * as keywordService from '../services/keyword.service.js';



export const listKeywords = asyncHandler(async (req, res) => {
  const { items, meta } = await keywordService.listKeywords({
    search: req.query.search,
    seed: req.query.seed,
    type: req.query.type,
    cursor: req.query.cursor,
    limit: req.query.limit,
  });

  return sendSuccess(res, items, { meta });
});

/**
 * The keyword page.
 *
 * Returns two relationship lists — `related`, which an editor asserted, and
 * `alsoAppearsWith`, which the corpus produced by frequency. They are not
 * combined, because presenting a count as an editorial claim is the exact
 * failure PRODUCT.md warns about when it asks that cultural descriptions
 * attribute sources rather than present one retelling as definitive.
 */
export const getKeyword = asyncHandler(async (req, res) => {
  const keyword = await keywordService.getKeywordByKey(req.params.key);
  return sendSuccess(res, keyword);
});

export const getKeywordById = asyncHandler(async (req, res) => {
  const keyword = await keywordService.getKeywordById(req.params.keywordId);
  return sendSuccess(res, keyword);
});

/**
 * Resolves a piece of text to a keyword, or to nothing.
 *
 * Backs the "follow this word" tap in the reading view. It resolves through the
 * same alias table the extractor matches against, so a word that was attached
 * to a story is a word this can resolve — any other implementation would
 * eventually disagree with the extractor, and the symptom would be a link that
 * works on one story and not on an identically tagged one.
 *
 * A miss is a 200 with `null`, not a 404. "This word is not in the index" is a
 * normal answer to a question about arbitrary text, and a 404 would make a
 * client treat an ordinary miss as an error.
 */
export const resolveKeyword = asyncHandler(async (req, res) => {
  const keyword = await keywordService.resolveAlias(req.query.text);
  return sendSuccess(res, keyword ?? null);
});

/** Community contribution with optimistic revision checks in the service. */
export const upsertKeyword = asyncHandler(async (req, res) => {
  const { key, ...payload } = req.body;
  const { keyword, created } = await keywordService.upsertKeyword({ key, payload, userId: req.auth.userId });

  if (created) return sendCreated(res, keyword.toPublicJSON());

  return sendSuccess(res, keyword.toPublicJSON());
});

export default {
  listKeywords,
  getKeyword,
  getKeywordById,
  resolveKeyword,
  upsertKeyword,
};
