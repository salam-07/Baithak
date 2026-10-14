import mongoose from 'mongoose';

import {
  INTEREST_KINDS,
  INTEREST_SOURCES,
  INTEREST_MIN_ACTIVE_WEIGHT,
} from '../config/constants.js';
import { normalizeText } from '../utils/normalize.js';

const { Schema } = mongoose;


const interestSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    
    kind: {
      type: String,
      required: true,
      enum: { values: INTEREST_KINDS, message: '{VALUE} is not a valid interest kind.' },
    },

    /**
     * The identity, stored as a string for every kind.
     *
     * For a keyword this is the ObjectId in hex, which is a compromise worth
     * naming. Storing it as a real ObjectId would give referential integrity
     * and let a `$lookup` work directly, but the other two kinds are strings,
     * and a field that is sometimes an ObjectId and sometimes a string is the
     * kind of thing that works until the first `$setIntersection` silently
     * matches nothing. Keeping one type means the only conversion is the one
     * the feed service does explicitly when it builds its scoring arrays.
     */
    ref: {
      type: String,
      required: true,
      maxlength: 120,
    },

    
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    
    weight: {
      type: Number,
      default: 0,
    },

    /**
     * Set when a reader removes an interest by hand, cleared when they add it
     * back by hand. Likes never touch it.
     *
     * A separate flag rather than a weight adjustment, and the reason is worth
     * being precise about. The obvious approach — subtract enough weight to
     * push the entry negative — only suppresses until the next like arrives,
     * because a like adds weight back and the entry reactivates. A reader who
     * says "not this" and then reads and enjoys one story tagged with it would
     * find it back in their profile, which is exactly the outcome they acted to
     * prevent.
     *
     * So removal is a statement rather than an arithmetic operation, and it
     * outranks accumulated likes until the reader reverses it themselves.
     */
    blocked: {
      type: Boolean,
      default: false,
    },

    
    source: {
      type: String,
      enum: { values: INTEREST_SOURCES, message: '{VALUE} is not a valid interest source.' },
      default: 'like',
    },

    lastSignalAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true, versionKey: false },
);

/**
 * The constraint that makes counters trustworthy: at most one row per reader,
 * per kind, per reference. Every write in the interest service is built around
 * letting this index be the arbiter.
 */
interestSchema.index({ user: 1, kind: 1, ref: 1 }, { unique: true });

/**
 * The feed's only read from this collection: this reader's strongest interests.
 * `weight` is second in the key so the sort is satisfied by the index and the
 * top 50 can be taken without sorting every row the reader has accumulated.
 */
interestSchema.index({ user: 1, weight: -1, lastSignalAt: -1 });

// The pruning script walks every kind in weight order to find dead entries.
interestSchema.index({ kind: 1, weight: 1 });

interestSchema.pre('validate', function normalizeRef(next) {
  // story side folds them, or `Heer Ranjha` on a story would never match
  // `heer  ranjha` on a profile. Keywords arrive as a hex id and pass through
  // normalizeText untouched, since it contains only ASCII already.
  if (this.ref && this.kind !== 'keyword') this.ref = normalizeText(this.ref);
  next();
});

/** Whether this interest is strong enough to influence the feed. */
interestSchema.methods.isActive = function isActive() {
  if (this.blocked) return false;
  return this.weight >= INTEREST_MIN_ACTIVE_WEIGHT;
};

interestSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    kind: this.kind,
    ref: this.ref,
    label: this.label,
    weight: this.weight,
    source: this.source,
    blocked: this.blocked,
    lastSignalAt: this.lastSignalAt,
  };
};

export default mongoose.models.Interest ?? mongoose.model('Interest', interestSchema);
