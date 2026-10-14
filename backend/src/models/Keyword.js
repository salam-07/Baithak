import mongoose from 'mongoose';

import { KEYWORD_TYPES, KEYWORD_TYPE } from '../config/constants.js';
import { normalizeText } from '../utils/normalize.js';

const { Schema } = mongoose;

const sourceSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 200 },
    url: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false },
);


const keywordSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^[a-z0-9][a-z0-9-]{1,58}$/, 'A key must be a lowercase slug.'],
    },

    labels: {
      en: { type: String, trim: true, maxlength: 120 },
      pa: { type: String, trim: true, maxlength: 120 },
      // Punjabi in Latin letters, for readers who do not read Shahmukhi.
      roman: { type: String, trim: true, maxlength: 120 },
    },

    type: {
      type: String,
      enum: { values: KEYWORD_TYPES, message: '{VALUE} is not a valid keyword type.' },
      default: KEYWORD_TYPE.THEME,
    },

    /**
     * Every spelling that should resolve to this keyword — across all three
     * scripts and including common misspellings and transliteration variants.
     *
     * Stored as authored, for display and for editors to review. Matching never
     * reads this field: the extractor normalizes these once at load time and
     * matches against the normalized forms, so that both sides of the
     * comparison have been through the same folding. Comparing a raw alias to
     * normalized text is the single easiest way to make matching look broken.
     */
    aliases: {
      type: [String],
      default: [],
      validate: {
        validator: (aliases) => aliases.length <= 40,
        message: 'A keyword can carry at most 40 aliases.',
      },
    },

    /**
     * The normalized aliases, persisted rather than computed.
     *
     * Held so that a database-side query can find which keyword an alias
     * belongs to without loading the whole index, and so that two keywords
     * claiming the same normalized alias can be detected by an index rather
     * than by a scan. The extractor still builds its in-memory map from this.
     */
    normalizedAliases: {
      type: [String],
      default: [],
      index: true,
    },

    revision: { type: Number, default: 1 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    history: { type: [Schema.Types.Mixed], default: [], select: false },

    notes: {
      en: { type: String, trim: true, maxlength: 4000 },
      pa: { type: String, trim: true, maxlength: 4000 },
      roman: { type: String, trim: true, maxlength: 4000 },
    },

    /**
     * PRODUCT.md: "Cultural descriptions should acknowledge regional variants
     * and attribute sources instead of presenting one retelling as definitive."
     * This array is how that is honoured — an entry with no sources is an
     * editorial statement, and the API exposes `hasSources` so the interface
     * can say which it is looking at.
     */
    sources: {
      type: [sourceSchema],
      default: [],
    },

    
    related: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Keyword' }],
      default: [],
    },

    storyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    /**
     * False for entries created by promoting a detected term rather than by an
     * editor. Lets the interface distinguish "we know this" from "this appeared
     * often enough to index", which is the difference between a claim and an
     * observation.
     */
    isCurated: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true, versionKey: false },
);

keywordSchema.index({ storyCount: -1, key: 1 });
keywordSchema.index({ type: 1, storyCount: -1 });

// The label fields are searched from the "explore keywords" screen. Same
// `default_language: 'none'` reasoning as the story index: stemming English
// does nothing for Shahmukhi and can only remove meaningful Roman Urdu words.
//
// `language_override` gets the same treatment as the story index, and here it is
// insurance rather than a fix: this schema happens to have no field called
// `language`, so Mongo's default override finds nothing and falls back. It is
// set anyway because that is a property of today's labels, not of the index, and
// the failure it prevents is invisible — see the note in Story.js.
keywordSchema.index(
  { 'labels.en': 'text', 'labels.pa': 'text', 'labels.roman': 'text', aliases: 'text' },
  { default_language: 'none', language_override: 'searchLanguage', name: 'keyword_search' },
);

keywordSchema.pre('validate', function deriveAliases(next) {
  // Labels are aliases by definition: anything that names this keyword should
  // resolve to it. Folding them in here means an editor adding a label cannot
  // forget to also add the alias, which is exactly the oversight that would
  // make a keyword silently unmatchable in its own language.
  const candidates = [...(this.aliases ?? [])];

  if (this.labels) {
    for (const label of [this.labels.en, this.labels.pa, this.labels.roman]) {
      if (label) candidates.push(label);
    }
  }

  // The key itself, so `vanjhali` matches without anyone listing it twice.
  if (this.key) candidates.push(this.key.replace(/-/g, ' '));

  this.normalizedAliases = [...new Set(candidates.map((alias) => normalizeText(alias)).filter(Boolean))];

  next();
});

/**
 * The label to show, preferring the reader's chosen language and falling back
 * rather than showing nothing. PRODUCT.md: "Where a translation is unavailable,
 * clearly say so rather than fabricating one" — so the fallback returns null
 * for a genuinely missing label instead of substituting the other language
 * under a false name. Callers decide how to present that.
 */
keywordSchema.methods.labelFor = function labelFor(language) {
  if (language === 'pa') return this.labels?.pa ?? null;
  if (language === 'en') return this.labels?.en ?? null;

  return this.labels?.en ?? this.labels?.pa ?? this.labels?.roman ?? this.key;
};

keywordSchema.methods.toPublicJSON = function toPublicJSON() {
  // `related` may or may not have been populated depending on the caller, so
  // the shape is settled here rather than left to each controller. Duck-typing
  // on the method is used instead of `instanceof ObjectId` because a populated
  // entry is a full document and an unpopulated one is a bare ObjectId, and
  // only the first of those has anything to serialise.
  const related = (this.related ?? []).map((entry) =>
    typeof entry?.toPublicJSON === 'function' ? entry.toPublicJSON() : { id: entry });

  return {
    id: this._id,
    key: this.key,
    labels: {
      en: this.labels?.en ?? null,
      pa: this.labels?.pa ?? null,
      roman: this.labels?.roman ?? null,
    },
    type: this.type,
    notes: {
      en: this.notes?.en ?? null,
      pa: this.notes?.pa ?? null,
      roman: this.notes?.roman ?? null,
    },
    aliases: this.aliases ?? [],
    revision: this.revision ?? 1,
    sources: this.sources ?? [],
    // Surfaced so the interface can mark entries that are an editor's
    // description rather than a sourced claim, per the PRODUCT.md note above.
    hasSources: (this.sources?.length ?? 0) > 0,
    isCurated: this.isCurated,
    storyCount: this.storyCount,
    related,
  };
};

export default mongoose.models.Keyword ?? mongoose.model('Keyword', keywordSchema);
