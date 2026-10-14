import { z } from 'zod';

import { LANGUAGES } from '../config/constants.js';

/**
 * Pieces that every domain's schemas are built from.
 *
 * Two conventions run through all of these, and both matter more than they
 * look.
 *
 * First, every schema strips unknown keys. That is zod's default for objects,
 * and it is doing security work rather than tidiness: a body of
 * `{"username": "x", "$where": "..."}` reaching a query unfiltered is the
 * classic NoSQL operator injection, and stripping means only the fields named
 * here can ever reach a service. The sanitize middleware is the second layer,
 * for the paths a schema does not cover.
 *
 * Second, nothing here has an upper bound that duplicates `parseLimit`. A page
 * size is decided in exactly one place, and a schema that also claimed to know
 * the ceiling would be a second answer that drifts from the configured one.
 */

/**
 * Validated as a shape before it reaches a query, because a malformed id
 * otherwise reaches the driver as a CastError — a 500 that tells the caller
 * nothing and pages whoever is on call.
 */
export const objectId = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, 'Must be a 24-character id.');

/**
 * The cursor is opaque to clients, so this only bounds its size. It is not
 * decoded here: `decodeCursor` is the one place that understands the format,
 * and duplicating that knowledge into a schema is how the two end up
 * disagreeing.
 */
export const cursor = z.string().trim().min(4).max(2048);

export const limit = z.coerce.number().int().positive();

export const searchTerm = z.string().trim().min(1).max(120);

/**
 * Accepts `?x=1`, `?x=1,2` and a repeated `?x=1&x=2` alike, and always yields an
 * array.
 *
 * The array output is not a convenience. The story filter builds `$all` from
 * this, and `$all` compares an array against an array — passing it a bare
 * string relies on the server coercing a scalar into a one-element array, which
 * is the kind of implicit behaviour that works until it silently does not.
 * Handling all three spellings here also means the client does not have to know
 * which query parser is mounted, which is a detail of the server.
 */
export const languageList = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : [value]))
  .transform((values) =>
    values
      .flatMap((value) => String(value).split(','))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean))
  .pipe(z.array(z.enum(LANGUAGES)).min(1));

/**
 * A query-string boolean.
 *
 * `?flag=false` is a *non-empty string* and therefore truthy, which is the trap
 * this exists to close: a client asking to exclude blocked rows would otherwise
 * silently get them.
 */
export const booleanQuery = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean' ? value : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase()));


export const paginationShape = {
  cursor: cursor.optional(),
  limit: limit.optional(),
};

/**
 * A field-level error list for the 422 body.
 *
 * `path` is joined with dots so that a nested failure reads as
 * `texts.0.title` rather than as a bare array the client has to interpret.
 */
export function toValidationDetails(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || '(body)',
    message: issue.message,
  }));
}

export default {
  objectId,
  cursor,
  limit,
  searchTerm,
  languageList,
  booleanQuery,
  paginationShape,
  toValidationDetails,
};
