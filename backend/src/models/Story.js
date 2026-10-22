import mongoose from 'mongoose';

import {
  LANGUAGES,
  LANGUAGE,
  SCRIPTS,
  TEXT_SOURCES,
  TEXT_SOURCE,
  STORY_STATUS,
  STORY_STATUSES,
  MAX_KEYWORDS_PER_STORY,
  MAX_DETECTED_TERMS,
  DEFAULT_SCRIPT_BY_LANGUAGE,
} from '../config/constants.js';
import { normalizeText, detectScript } from '../utils/normalize.js';

const { Schema } = mongoose;

/**
 * One rendered version of a story, in one language and one script.
 *
 * Modelling text as a list rather than as `title`/`body` plus a `language` enum
 * is what makes the "Both" mode in PRODUCT.md expressible without a second
 * collection and without duplicating the story. It also means the original and
 * any translation are separate entries with separate `source` values, which is
 * what PRODUCT.md asks for: "Store translations separately and identify their
 * source." There is no path here that can overwrite an author's Punjabi with
 * somebody else's English.
 */
const textVariantSchema = new Schema(
  {
    language: {
      type: String,
      required: true,
      enum: { values: LANGUAGES, message: '{VALUE} is not a supported language.' },
    },

    /**
     * Orthogonal to `language` on purpose. Punjabi is written in Shahmukhi by
     * this product's audience, but Roman Urdu — Punjabi or Urdu in Latin
     * letters — is explicitly allowed by PRODUCT.md, and it is Punjabi-language
     * content in a Latin script. Collapsing the two into one field would make
     * that combination unrepresentable and force a schema change to add it.
     */
    script: {
      type: String,
      required: true,
      enum: { values: SCRIPTS, message: '{VALUE} is not a supported script.' },
      default: function defaultScript() {
        return DEFAULT_SCRIPT_BY_LANGUAGE[this.language] ?? 'latin';
      },
    },

    title: {
      type: String,
      required: [true, 'A title is required for every version of a story.'],
      trim: true,
      maxlength: [200, 'A title cannot be longer than 200 characters.'],
    },

    body: {
      type: String,
      required: [true, 'A story needs text.'],
      trim: true,
      // Generous, because a couplet and a long oral history live in the same
      // collection. The limit exists to bound document size and to reject a
      // paste that was never meant for a text field, not to shape the writing.
      maxlength: [50_000, 'A story cannot be longer than 50,000 characters.'],
    },

    /**
     * Marks the version the author actually wrote. Exactly one variant carries
     * this, enforced below, so "which one is the original" is never inferred
     * from array order — order is a storage detail and would be silently
     * wrong the first time a variant was reordered or removed.
     */
    isOriginal: {
      type: Boolean,
      default: false,
    },

    source: {
      type: String,
      enum: { values: TEXT_SOURCES, message: '{VALUE} is not a valid source.' },
      default: TEXT_SOURCE.AUTHOR,
    },
  },
  { _id: true, versionKey: false },
);

const storySchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    texts: {
      type: [textVariantSchema],
      validate: [
        {
          validator: (texts) => Array.isArray(texts) && texts.length > 0,
          message: 'A story needs at least one version.',
        },
        {
          validator: (texts) => texts.filter((t) => t.isOriginal).length === 1,
          message: 'Exactly one version must be marked as the original.',
        },
        {
          // Shahmukhi and Roman Punjabi coexist; only duplicate language/script
          // pairs are ambiguous to the reader and annotation lookup.
          validator: (texts) => {
            const pairings = texts.map((t) => `${t.language}:${t.script}`);
            return new Set(pairings).size === pairings.length;
          },
          message: 'Two versions cannot share both the same language and the same script.',
        },
      ],
    },

    /**
     * Derived from `texts` in a pre-validate hook and never written by a client.
     *
     * It exists because the filter "show me Punjabi stories" needs to be an
     * indexed equality check. Querying `texts.language` directly is a multikey
     * match that cannot be combined with the feed's sort key in one index, so
     * the default feed would degrade to a scan on every language switch.
     */
    languages: {
      type: [String],
      enum: { values: LANGUAGES, message: '{VALUE} is not a supported language.' },
    },


    /**
     * Curated keywords matched in the text. Real references, so a keyword page
     * is an indexed lookup against `keywords` rather than a text scan, and so a
     * renamed keyword updates everywhere at once.
     */
    keywordRevision: { type: Number, default: 1 },
    keywordSettings: {
      custom: [{ type: Schema.Types.ObjectId, ref: 'Keyword' }],
      excluded: [{ type: Schema.Types.ObjectId, ref: 'Keyword' }],
      notes: [{ _id: false, keyword: { type: Schema.Types.ObjectId, ref: 'Keyword' }, explanation: { type: String, maxlength: 4000 } }],
    },
    keywordHistory: { type: [Schema.Types.Mixed], default: [], select: false },
    keywords: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Keyword' }],
      validate: {
        validator: (keywords) => keywords.length <= MAX_KEYWORDS_PER_STORY,
        message: `A story can carry at most ${MAX_KEYWORDS_PER_STORY} keywords.`,
      },
    },

    /**
     * Terms that cleared the frequency threshold but match nothing curated.
     *
     * Kept deliberately separate from `keywords` rather than auto-promoting
     * them, because these are guesses from a word count. They still contribute
     * to affinity — a reader who likes three stories about `sufi` clearly wants
     * more of that — but they are not presented as entries in the cultural
     * index, which would claim an editorial authority nobody has exercised.
     */
    terms: {
      type: [String],
      validate: {
        validator: (terms) => terms.length <= MAX_DETECTED_TERMS,
        message: `A story can carry at most ${MAX_DETECTED_TERMS} detected terms.`,
      },
    },

    // Editorial designation; never accepted from ordinary author endpoints.
    isCurated: {
      type: Boolean, default: false,
      validate: {
        validator: function (value) {
          if (!value) return true;
          const variants = new Set(this.texts.map(text => `${text.language}:${text.script}`));
          return ['en:latin', 'pa:shahmukhi', 'pa:roman'].every(pair => variants.has(pair));
        },
        message: 'Curated stories need English, Shahmukhi, and Roman Punjabi versions.',
      },
    },

    status: {
      type: String,
      enum: { values: STORY_STATUSES, message: '{VALUE} is not a valid status.' },
      default: STORY_STATUS.DRAFT,
    },

    /**
     * Set once, when the story first becomes public, and never reset — so that
     * editing a story does not push it back to the top of everyone's feed.
     * Editing in place should not be a way to buy attention.
     */
    publishedAt: {
      type: Date,
      default: null,
    },

    /**
     * Denormalised count, maintained atomically by the like service.
     *
     * A count is needed on every card in every feed, and computing it per card
     * would be an aggregation over the likes collection on the read path. The
     * trade is that it can drift if a write half-fails, which is why the like
     * service performs the insert and the increment as separate steps and
     * treats the unique index — not the counter — as the source of truth.
     */
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
    toJSON: { virtuals: false },
  },
);

/**
 * Indexes, each tied to a query that actually runs.
 *
 * The recurring shape is `status` first, because every public read filters on
 * it and a leading equality match is what lets the rest of the key be used for
 * sorting rather than being filtered after the fact.
 */

// The default feed: published stories, newest first, `_id` as tie-breaker so
// that two stories sharing a timestamp still have a total order to paginate on.
storySchema.index({ status: 1, publishedAt: -1, _id: -1 });
storySchema.index({ status: 1, isCurated: 1, publishedAt: -1, _id: -1 });


// Keyword pages and the affinity feed's candidate generation.
storySchema.index({ status: 1, keywords: 1, publishedAt: -1 });

// Language switch in the feed. `languages` is also multikey, and `$all` against
// a multikey index is the one form of array query that stays efficient.
storySchema.index({ status: 1, languages: 1, publishedAt: -1 });

// An author's own list, including their drafts — so this index is not prefixed
// by `status`. That is a deliberate difference from the others: it is the only
// query here that returns unpublished work.
storySchema.index({ author: 1, publishedAt: -1, _id: -1 });

// The "popular this week" rule needs published stories inside a time window
// ordered by likes. Including `likeCount` lets the window be scanned in order
// and stopped early, instead of sorting every story published this week.
storySchema.index({ status: 1, publishedAt: -1, likeCount: -1 });

/**
 * Free-text search.
 *
 * `default_language: 'none'` disables stemming and stopword removal, and it is
 * the right setting here rather than a shortcut. The built-in English stemmer
 * applied to Shahmukhi does nothing useful, and its stopword list would strip
 * English words that are meaningful in Roman Urdu. With no stemming, all three
 * scripts are indexed as literal tokens, which is predictable even though it
 * will not match `vanjhali` against `vanjhaliyan`.
 *
 * Weights reflect what a match is worth: a title hit says more about a story
 * than a hit in the body does.
 *
 * The honest limitation, recorded here because it is not visible from the query
 * side: MongoDB's text index does not understand Perso-Arabic morphology, and
 * it offers no relevance tuning beyond these weights. Atlas Search is the
 * upgrade path when search quality starts to matter, and the search service is
 * isolated behind one function so that swap is contained.
 *
 * `language_override` is set to a field name nothing writes, and that is not
 * decoration. Mongo reads a per-document search language from a field called
 * `language` unless told otherwise, and refuses the insert when the value is not
 * one of its supported search languages. This schema has a `language` field —
 * inside every entry of `texts`, holding `en` or `pa` — so every Punjabi story
 * failed to insert with `language override unsupported: pa`, while every English
 * one went in. Half a corpus writing and half not, with the failure surfacing at
 * the driver and nothing in the schema to point at, is about the least
 * discoverable shape this could have taken.
 */
storySchema.index(
  { 'texts.title': 'text', 'texts.body': 'text', terms: 'text' },
  {
    default_language: 'none',
    language_override: 'searchLanguage',
    weights: { 'texts.title': 10, terms: 4, 'texts.body': 1 },
    name: 'story_search',
  },
);

/**
 * Derives fields a client must not set, and normalizes what it did set.
 *
 * Runs on validate rather than on save so that `validate()` alone — which is
 * what the tests call — produces the same document as a real write. A hook on
 * `save` would leave validation and persistence disagreeing about the shape.
 */
storySchema.pre('validate', function deriveFields(next) {
  if (Array.isArray(this.texts) && this.texts.length > 0) {
    // Preserve the order the variants were given in, since it reflects the
    // author's own ordering, but deduplicate in case two entries somehow share
    // a language after the validators above pass.
    this.languages = [...new Set(this.texts.map((text) => text.language))];
  }


  if (Array.isArray(this.terms)) {
    this.terms = [...new Set(this.terms.map((term) => normalizeText(term)).filter(Boolean))];
  }

  // Script is inferred when a client omits it, which is the common case: the
  // client knows it is sending Punjabi but may not know whether the text it
  // holds is Shahmukhi or Roman. Filling it from the text itself is more
  // reliable than trusting a default, and the field is only a rendering hint.
  if (Array.isArray(this.texts)) {
    for (const text of this.texts) {
      if (!text.script) {
        text.script = detectScript(`${text.title ?? ''} ${text.body ?? ''}`)
          ?? DEFAULT_SCRIPT_BY_LANGUAGE[text.language]
          ?? 'latin';
      }
    }
  }

  next();
});

/**
 * "both" is not a stored value — it is the presence of two language entries.
 *
 * Exposed as a virtual so the API can still speak in the vocabulary the product
 * uses ("a story can be in English, Punjabi, or both") without the schema
 * carrying a redundant field that could contradict `texts`.
 */
storySchema.virtual('languageMode').get(function languageMode() {
  if (!Array.isArray(this.languages) || this.languages.length === 0) return null;
  return this.languages.length > 1 ? 'both' : this.languages[0];
});

/**
 * The card shape used in every feed.
 *
 * Built with an explicit allowlist, so adding a field to the schema does not
 * silently publish it. `body` is truncated here rather than being projected
 * away, because a feed needs an excerpt and fetching 50,000 characters per card
 * to then slice it in the controller would waste most of the response's
 * bandwidth on the database hop.
 */
storySchema.methods.toCard = function toCard({ excerptLength = 240 } = {}) {
  const preferred = this.texts?.find((text) => text.isOriginal) ?? this.texts?.[0];

  const excerptOf = (text) => {
    if (!text?.body) return null;
    return text.body.length > excerptLength
      ? `${text.body.slice(0, excerptLength).trimEnd()}…`
      : text.body;
  };

  return {
    id: this._id,
    isCurated: this.isCurated === true,
    author: this.author,
    languageMode: this.languageMode,
    texts: (this.texts ?? []).map((text) => ({
      language: text.language,
      script: text.script,
      title: text.title,
      excerpt: excerptOf(text),
      source: text.source,
      isOriginal: text.isOriginal,
    })),
    title: preferred?.title ?? null,
    excerpt: excerptOf(preferred),
    keywords: this.keywords ?? [],
    languages: this.languages ?? [],
    likeCount: this.likeCount,
    publishedAt: this.publishedAt,
    createdAt: this.createdAt,
  };
};

export default mongoose.models.Story ?? mongoose.model('Story', storySchema);
