import { z } from 'zod';

import {
  LANGUAGES,
  SCRIPTS,
  TEXT_SOURCES,
  STORY_STATUS,
} from '../config/constants.js';
import { objectId, searchTerm, languageList, paginationShape } from './common.validator.js';

/**
 * Story publishing, editing and listing.
 *
 * The shape being validated is the array of text variants described in
 * Story.js. The job here is not to restate the model's rules — the model is the
 * authority and enforces them again — but to turn the ones a client can
 * plausibly get wrong into a 422 with a field name, instead of a Mongoose
 * ValidationError that arrives as a 500 and says `texts.0.isOriginal` to
 * somebody who never used that word.
 */

const textVariant = z.object({
  language: z.enum(LANGUAGES),

  script: z.enum(SCRIPTS).optional(),

  title: z.string().trim().min(1, 'Every version of a story needs a title.').max(200),

  body: z.string().trim().min(1, 'Every version of a story needs text.').max(50_000),

  /**
   * Defaulted rather than required, and corrected below.
   *
   * A client publishing one version has nothing to decide — it is the original
   * by definition — and forcing them to send a flag whose only possible value
   * is `true` invites the one bug that matters here: sending it as a string,
   * `"false"`, and having the model reject the story for having no original.
   */
  isOriginal: z.boolean().optional().default(false),

  // Only `author` and `community` are accepted. PRODUCT.md asks that
  // translations be identified by source, so an unrecognised value is rejected
  // rather than stored as an unlabelled claim.
  source: z.enum(TEXT_SOURCES).optional().default('author'),
});

/**
 * The variants, with the "which one is the original" invariant resolved here.
 *
 * A single variant is marked as the original automatically; with two or more,
 * exactly one must be flagged, because there is no sensible guess between them.
 * Deciding this in the schema means the rule is stated in the error message a
 * client sees, rather than in a database validator they never read.
 */
const texts = z
  .array(textVariant)
  .min(1, 'A story needs at least one version.')
  // Two languages, each in at most two scripts, is the whole space the product
  // describes. The cap is a sanity bound, not a product limit.
  .max(4, 'A story can carry at most four versions.')
  .transform((variants) =>
    variants.length === 1 ? [{ ...variants[0], isOriginal: true }] : variants)
  .refine((variants) => variants.filter((variant) => variant.isOriginal).length === 1, {
    message: 'Mark exactly one version as the original.',
  })
  .refine(
    (variants) => new Set(variants.map((variant) => variant.language)).size === variants.length,
    { message: 'A story cannot have two versions in the same language.' },
  );


/** `removed` is absent on purpose: it is a moderation outcome, not a choice. */
const authorStatus = z.enum([STORY_STATUS.DRAFT, STORY_STATUS.PUBLISHED]);

export const createStorySchema = z.object({
  texts,

  status: authorStatus.optional(),
});

/**
 * Every field optional, and an empty body rejected.
 *
 * A PATCH that changes nothing should say so rather than silently rewriting the
 * document and re-running keyword extraction over unchanged text, which is a
 * write and a cache load for no reason.
 */
export const updateStorySchema = z
  .object({
    texts: texts.optional(),

    status: authorStatus.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update.' });

/**
 * The public story listing.
 *
 * `language` is the one that needs care: the filter is `$all`, so asking for
 * both languages returns stories carrying both rather than either, and a client
 * spells that as `?language=en,pa`.
 */
export const listStoriesQuerySchema = z.object({
  ...paginationShape,


  keyword: objectId.optional(),

  language: languageList.optional(),

  author: objectId.optional(),

  /**
   * Free text, bounded. Passed to the `$text` operator rather than a regex: a
   * client-supplied regex is a denial-of-service vector through catastrophic
   * backtracking, and the text index has none of that risk.
   */
  search: searchTerm.optional(),

  /**
   * Present ⇒ the listing comes back shuffled in an order derived from this
   * number. Absent ⇒ the default newest-first order, which is what every other
   * caller of this endpoint wants.
   *
   * The client is expected to send the same seed for every page of one session,
   * which is what keeps `nextCursor` walking a single sequence, and a fresh seed
   * after a reload, which is what reshuffles. The ceiling is a product bound
   * rather than a technical one: `shuffleIds` takes any number, so six digits are
   * simply as many deals as anyone could load in a lifetime.
   */
  seed: z.coerce.number().int().min(0).max(999_999).optional(),
});

export const listByAuthorQuerySchema = z.object({
  ...paginationShape,
});

export const storyIdParamSchema = z.object({
  storyId: objectId,
});

export const authorIdParamSchema = z.object({
  authorId: objectId,
});

export default {
  createStorySchema,
  updateStorySchema,
  listStoriesQuerySchema,
  listByAuthorQuerySchema,
  storyIdParamSchema,
  authorIdParamSchema,
};
