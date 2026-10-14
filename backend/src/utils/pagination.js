import mongoose from 'mongoose';
import ApiError from './ApiError.js';
import env from '../config/env.js';

/**
 * Keyset ("cursor") pagination rather than skip/limit.
 *
 * The reason is not style. `skip: 5000` makes the server walk and discard 5000
 * documents before returning anything, so page 250 costs 250 times page 1, and
 * a story published while a reader is paging shifts every subsequent row —
 * they see one story twice and miss another. A cursor names the last row seen
 * and asks for the ones after it, which is an index seek at any depth and is
 * stable under concurrent writes.
 *
 * The cursor is opaque on purpose: base64 of a versioned tuple. Clients must
 * not construct or parse it, which keeps the sort order free to change later as
 * long as the version is bumped.
 */

const CURSOR_VERSION = 1;

/**
 * Sort keys are described rather than inferred, because the value has to
 * survive a JSON round-trip and come back as the right BSON type. A Date
 * serialises to a string, and comparing a string to a Date in a Mongo query
 * silently matches nothing — a pagination bug that looks like an empty page.
 */
export const KEY_TYPES = Object.freeze({
  DATE: 'date',
  OBJECT_ID: 'objectId',
  NUMBER: 'number',
  STRING: 'string',
});

export const DIRECTION = Object.freeze({
  ASC: 'asc',
  DESC: 'desc',
});

/** The default feed: newest published first, `_id` as the stable tie-breaker. */
export const PUBLISHED_KEYS = Object.freeze([
  { field: 'publishedAt', direction: DIRECTION.DESC, type: KEY_TYPES.DATE },
  { field: '_id', direction: DIRECTION.DESC, type: KEY_TYPES.OBJECT_ID },
]);

/** The affinity feed: ranked by score, then by recency, then by identifier. */
export const FEED_KEYS = Object.freeze([
  { field: 'score', direction: DIRECTION.DESC, type: KEY_TYPES.NUMBER },
  { field: 'publishedAt', direction: DIRECTION.DESC, type: KEY_TYPES.DATE },
  { field: '_id', direction: DIRECTION.DESC, type: KEY_TYPES.OBJECT_ID },
]);

/**
 * The cursor keys of the shuffled feed, which name where a reader got to rather
 * than a sort key.
 *
 * Every other list here describes an ordering the database performs, and its
 * cursor is a predicate — `buildKeysetFilter` — that walks an index past the last
 * row. The shuffled feed's order is decided in the application, because the
 * database cannot express it; `utils/shuffle.js` carries the argument. There is
 * therefore no stored key for the database to compare against, and
 * `buildKeysetFilter` is deliberately never called with this list. It exists so
 * the cursor machinery has a shape to encode: the id of the last card served,
 * which the shuffle looks up to resume from.
 */
export const SHUFFLE_CURSOR_KEYS = Object.freeze([
  { field: '_id', direction: DIRECTION.ASC, type: KEY_TYPES.OBJECT_ID },
]);

/**
 * A missing key is a real value, not an error: a story saved before a field
 * existed has no `score`, and `$sort` puts those last. Encoding them as null
 * lets pagination walk through them instead of failing at the boundary — the
 * alternative is a page that can never be traversed past.
 */
function serialise(value, type) {
  if (value === null || value === undefined) return null;

  switch (type) {
    case KEY_TYPES.DATE:
      return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
    case KEY_TYPES.OBJECT_ID:
      return String(value);
    case KEY_TYPES.NUMBER:
      return Number(value);
    default:
      return String(value);
  }
}

function deserialise(value, type) {
  if (value === null || value === undefined) return null;

  switch (type) {
    case KEY_TYPES.DATE: {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) throw ApiError.badRequest('Malformed cursor.');
      return date;
    }
    case KEY_TYPES.OBJECT_ID:
      if (!mongoose.Types.ObjectId.isValid(value)) throw ApiError.badRequest('Malformed cursor.');
      return new mongoose.Types.ObjectId(value);
    case KEY_TYPES.NUMBER: {
      const num = Number(value);
      if (!Number.isFinite(num)) throw ApiError.badRequest('Malformed cursor.');
      return num;
    }
    default:
      return String(value);
  }
}

export function encodeCursor(doc, keys) {
  const tuple = keys.map((key) => serialise(doc[key.field], key.type));
  const payload = JSON.stringify({ v: CURSOR_VERSION, k: tuple });

  return Buffer.from(payload, 'utf8').toString('base64url');
}

export function decodeCursor(cursor, keys) {
  let parsed;

  try {
    parsed = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    // A client that stored a cursor from an older deployment will land here.
    // Treated as a bad request rather than silently restarting from the top,
    // because restarting would quietly re-serve stories the reader has already
    // read and look like the feed is broken.
    throw ApiError.badRequest('Malformed cursor.');
  }

  if (!parsed || parsed.v !== CURSOR_VERSION || !Array.isArray(parsed.k)) {
    throw ApiError.badRequest('Unsupported cursor version. Reload the feed to continue.');
  }

  if (parsed.k.length !== keys.length) throw ApiError.badRequest('Malformed cursor.');

  return keys.map((key, index) => deserialise(parsed.k[index], key.type));
}

const operatorFor = (direction) => (direction === DIRECTION.DESC ? '$lt' : '$gt');

/**
 * Builds the "strictly after this row" predicate for a multi-key sort.
 *
 * A single `{ publishedAt: { $lt: cursor } }` is wrong when the sort has a
 * tie-breaker: two stories sharing a timestamp would both be skipped once the
 * cursor lands on one of them. The correct form is a disjunction over prefixes
 * — `a < a0` OR (`a = a0` AND `b < b0`) OR ... — which is what this emits, and
 * why `_id` has to be in every key list.
 *
 * Mongo can still use an index for this: the `$or` branches are all anchored on
 * the leading key.
 */
export function buildKeysetFilter(values, keys) {
  const clauses = [];

  for (let i = 0; i < keys.length; i += 1) {
    const clause = {};

    // Every key before `i` matched exactly; key `i` is past the cursor.
    for (let j = 0; j < i; j += 1) {
      clause[keys[j].field] = values[j];
    }

    const key = keys[i];
    const value = values[i];

    // A null cursor component means the previous row had no value for this
    // field, which sorts last. Nothing sorts after last, so this branch can
    // only contribute the equality prefixes.
    if (value !== null) {
      clause[key.field] = { [operatorFor(key.direction)]: value };
      clauses.push(clause);
    } else if (i === 0) {
      // Leading key absent: everything with a value sorts before the cursor
      // row, so the remainder of the result set is exactly the null group.
      clauses.push({ [key.field]: null });
    }
  }

  return clauses.length ? { $or: clauses } : {};
}

/**
 * Ordered sort object for `.sort()`, including the computed `score` field the
 * affinity feed adds via `$addFields`.
 */
export function buildSort(keys) {
  return keys.reduce((sort, key) => {
    sort[key.field] = key.direction === DIRECTION.DESC ? -1 : 1;
    return sort;
  }, {});
}

/**
 * Clamps a client-supplied limit. `Number('abc')` is NaN and `undefined ?? 20`
 * looks fine until a client sends `?limit=` — both are handled here rather than
 * at each call site, because a NaN reaching `.limit()` throws from the driver.
 *
 * The ceiling defaults to the configured `MAX_PAGE_SIZE` and is clamped rather
 * than rejected: a client asking for more than it may have is not attacking
 * anything, and returning the largest page they are allowed keeps a long list
 * working instead of failing it. The validators deliberately do not impose an
 * upper bound, so this is the single place a page size is decided.
 */
export function parseLimit(rawLimit, { defaultLimit, maxLimit } = {}) {
  const fallback = defaultLimit ?? env.pagination.defaultLimit;
  const ceiling = maxLimit ?? env.pagination.maxPageSize;

  if (rawLimit === undefined || rawLimit === null || rawLimit === '') return fallback;

  const parsed = Number(rawLimit);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;

  return Math.min(Math.floor(parsed), ceiling);
}

/**
 * Turns a page of results into the `meta.pagination` block.
 *
 * `hasMore` comes from over-fetching by one rather than from a count, because a
 * `countDocuments` on a filtered feed is a second full index scan for a number
 * the client does not need, and on a large collection it is the most expensive
 * part of the request.
 */
export function buildPageMeta(rows, limit, keys, { extra } = {}) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const last = items[items.length - 1];

  return {
    items,
    meta: {
      pagination: {
        limit,
        count: items.length,
        hasMore,
        nextCursor: hasMore && last ? encodeCursor(last, keys) : null,
      },
      ...(extra ?? {}),
    },
  };
}
