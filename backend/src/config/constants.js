// Values that the data model, the validators and the routes all have to agree
// on. They live in one file because the failure mode of duplication here is
// silent: a Mongoose enum and a zod enum that drift apart produce a validator
// that accepts a value the schema then rejects, and the 500 that follows points
// nowhere near the real cause.

/**
 * Shahmukhi is Punjabi in the Perso-Arabic script, and is the script this
 * product cares about — not Gurmukhi. Roman is Punjabi or Urdu written in Latin
 * letters. Keeping script separate from language is what lets "Punjabi" cover
 * both without the two concepts collapsing into one another.
 */
export const LANGUAGE = Object.freeze({
  ENGLISH: 'en',
  PUNJABI: 'pa',
});

export const LANGUAGES = Object.freeze(Object.values(LANGUAGE));

export const SCRIPT = Object.freeze({
  LATIN: 'latin',
  SHAHMUKHI: 'shahmukhi',
  ROMAN: 'roman',
});

export const SCRIPTS = Object.freeze(Object.values(SCRIPT));

/**
 * Which script a language is normally written in. Used only to pick a sensible
 * default when a client does not send one; it is never enforced, because Roman
 * Urdu is a legitimate choice for English-script Punjabi.
 */
export const DEFAULT_SCRIPT_BY_LANGUAGE = Object.freeze({
  [LANGUAGE.ENGLISH]: SCRIPT.LATIN,
  [LANGUAGE.PUNJABI]: SCRIPT.SHAHMUKHI,
});

/**
 * Where a text variant came from. `author` means the person who published the
 * story wrote it; `community` means somebody else supplied it and it should be
 * attributed as such. PRODUCT.md requires translations be identified by source
 * rather than blended into the original, and this is that marker.
 */
export const TEXT_SOURCE = Object.freeze({
  AUTHOR: 'author',
  COMMUNITY: 'community',
});

export const TEXT_SOURCES = Object.freeze(Object.values(TEXT_SOURCE));

export const STORY_STATUS = Object.freeze({
  DRAFT: 'draft',
  PUBLISHED: 'published',
  REMOVED: 'removed',
});

export const STORY_STATUSES = Object.freeze(Object.values(STORY_STATUS));

export const USER_ROLE = Object.freeze({
  READER: 'reader',
  EDITOR: 'editor',
  ADMIN: 'admin',
});

export const USER_ROLES = Object.freeze(Object.values(USER_ROLE));

export const USER_STATUS = Object.freeze({
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
});

export const USER_STATUSES = Object.freeze(Object.values(USER_STATUS));


export const INTEREST_KIND = Object.freeze({
  KEYWORD: 'keyword',
  TERM: 'term',
});

export const INTEREST_KINDS = Object.freeze(Object.values(INTEREST_KIND));

/**
 * How an interest got onto a profile, which also decides how much it counts.
 * A deliberate act should outweigh an inferred one: a reader searching for and
 * adding Vanjhali has said something clearer about themselves than a single
 * like did.
 *
 * The asymmetry is deliberate in the other direction too — an unlike subtracts
 * exactly what the like added, so the two cancel and a reader who changes their
 * mind is not left with a residue they cannot clear.
 */
export const INTEREST_SOURCE = Object.freeze({
  LIKE: 'like',
  MANUAL: 'manual',
});

export const INTEREST_SOURCES = Object.freeze(Object.values(INTEREST_SOURCE));

export const INTEREST_WEIGHT = Object.freeze({
  [INTEREST_SOURCE.LIKE]: 1,
  [INTEREST_SOURCE.MANUAL]: 3,
});

/**
 * A manual removal must be able to suppress an interest the likes keep adding
 * back, so a weight at or below this is treated as "not interested" by the feed
 * rather than merely "weakly interested". Without the floor a reader who
 * disliked something would keep seeing it.
 */
export const INTEREST_MIN_ACTIVE_WEIGHT = 1;

export const KEYWORD_TYPE = Object.freeze({
  OBJECT: 'object',
  PLACE: 'place',
  PERSON: 'person',
  TRADITION: 'tradition',
  THEME: 'theme',
  METAPHOR: 'metaphor',
  WORD: 'word',
});

export const KEYWORD_TYPES = Object.freeze(Object.values(KEYWORD_TYPE));

export const PAGINATION = Object.freeze({
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  /**
   * Ceiling on ranked candidates the affinity feed will score. The feed sorts
   * on a computed score, so it cannot lean on an index for ordering and has to
   * materialise its working set first. This is the bound that keeps that set
   * from growing with the corpus.
   */
  FEED_CANDIDATE_LIMIT: 500,
});

/**
 * How many fallback terms are kept per story. These are unlinked guesses from
 * raw term frequency, so a long story can produce hundreds of them; keeping all
 * of them would bloat the document and add noise to the affinity feed for no
 * recall benefit.
 */
export const MAX_DETECTED_TERMS = 12;

/**
 * Tokens shorter than this are almost never meaningful in either script, and in
 * Shahmukhi they are usually fragments of a word that tokenisation split at a
 * non-joining character.
 */
export const MIN_TERM_LENGTH = 3;

export const MAX_KEYWORDS_PER_STORY = 1000;

/**
 * How much of a story body a feed card carries.
 *
 * The truncation happens in the database, not after the fetch. A page of 50
 * stories whose bodies average even 4,000 characters is 200KB moved out of
 * Mongo and across the wire per request, of which the client renders about
 * 1.5% — and the waste scales with how long the stories are rather than with
 * how many are shown. Truncating in the pipeline makes the cost of a card
 * independent of the length behind it.
 */
export const CARD_EXCERPT_LENGTH = 240;

/**
 * How much of a keyword's explanation a feed card carries.
 *
 * Same reasoning as the excerpt above, one level down: a card shows the word's
 * meaning in a tooltip that previews roughly 190 characters, so shipping the whole
 * note — up to 4,000 characters in each of three languages — would move an order of
 * magnitude more text than the surface can show. The word page keeps the note in
 * full; only the card's copy is cut.
 */
export const CARD_NOTE_LENGTH = 240;

/** Ordering guarantee for the default feed: sort keys, in order. */
export const STORY_SORT = Object.freeze({
  PUBLISHED: { publishedAt: -1, _id: -1 },
});
