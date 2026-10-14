import { z } from 'zod';

import { KEYWORD_TYPES } from '../config/constants.js';
import { objectId, searchTerm, paginationShape } from './common.validator.js';



export const listKeywordsQuerySchema = z.object({
  seed: z.coerce.number().int().min(0).max(999_999).optional(),
  ...paginationShape,
  search: searchTerm.optional(),
  type: z.enum(KEYWORD_TYPES).optional(),
});

export const keywordKeyParamSchema = z.object({
  key: z.string().trim().toLowerCase().min(1).max(80),
});

export const keywordIdParamSchema = z.object({
  keywordId: objectId,
});

/**
 * The "follow this word" lookup.
 *
 * Bounded, and it has to be: this is the one query in the API that runs on
 * arbitrary text a reader selected or typed, and an unbounded string would be
 * normalised and folded before anything looked at a length.
 */
export const resolveKeywordQuerySchema = z.object({
  text: z.string().trim().min(1, 'Some text is required.').max(200),
});

/**
 * Editorial writes to the cultural index.
 *
 * `aliases` has no default here: an absent array and an empty one mean
 * different things on an update — "leave the aliases alone" versus "remove them
 * all" — and only the caller knows which they meant. The model derives labels
 * into the alias list on validate, so an editor adding a Shahmukhi label gets
 * it matchable without also adding the alias by hand.
 */
export const upsertKeywordSchema = z.object({
  revision: z.number().int().min(1).optional(),
  key: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9][a-z0-9-]{1,58}$/, 'A key must be a lowercase slug, like `heer-ranjha`.'),

  labels: z
    .object({
      en: z.string().trim().max(120).optional(),
      pa: z.string().trim().max(120).optional(),
      roman: z.string().trim().max(120).optional(),
    })
    .optional(),

  type: z.enum(KEYWORD_TYPES).optional(),

  aliases: z.array(z.string().trim().min(1).max(120)).max(40).optional(),

  notes: z
    .object({
      en: z.string().trim().max(4000).optional(),
      pa: z.string().trim().max(4000).optional(),
      roman: z.string().trim().max(4000).optional(),
    })
    .optional(),

  /**
   * Cited sources. PRODUCT.md asks that a cultural description attribute its
   * sources rather than present one retelling as definitive, so a URL is
   * validated as a URL here — a source that cannot be followed is not a source.
   */
  sources: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(200),
        url: z.string().trim().url('A source URL must be a valid URL.').max(500).refine(value => /^https?:\/\//i.test(value), 'Use an HTTP or HTTPS source.').optional(),
      }),
    )
    .max(20)
    .optional(),

  related: z.array(objectId).max(50).optional(),

  isCurated: z.boolean().optional(),
});

export default {
  listKeywordsQuerySchema,
  keywordKeyParamSchema,
  keywordIdParamSchema,
  resolveKeywordQuerySchema,
  upsertKeywordSchema,
};
