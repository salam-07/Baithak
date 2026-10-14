import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * One appreciation, one account, one story.
 *
 * A separate collection rather than a `likedBy` array on the story, for a
 * reason that shows up quickly at scale: an unbounded array in a hot document
 * is rewritten in full on every insert, so a popular story becomes the most
 * expensive document in the database to write to, and it eventually hits the
 * 16MB document limit. A collection of small documents has neither problem, and
 * it is what makes the popularity rule queryable.
 *
 * Note the name. `Like` carries connotations the product does not claim, and
 * PRODUCT.md discusses this as an "appreciation" interaction with abuse
 * controls and one-per-account semantics. The collection is named for the
 * mechanic; the API surfaces it under the same name so there is no second
 * vocabulary to learn.
 */
const likeSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    story: {
      type: Schema.Types.ObjectId,
      ref: 'Story',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

/**
 * The uniqueness constraint is the real guard against double-counting.
 *
 * The service checks for an existing like before inserting, but a check
 * followed by an insert is a race: two requests from the same reader in the
 * same instant both see nothing and both insert. Letting the duplicate-key
 * error be the thing that stops it means the outcome is correct regardless of
 * timing, and the check beforehand is only there to avoid a pointless write.
 */
likeSchema.index({ user: 1, story: 1 }, { unique: true });

/**
 * The window scan for "popular this week": one story's appreciations inside a
 * date range. The unique index above cannot serve this — it is keyed by user
 * first, so a query by story would have to scan every like in the system.
 *
 * Counting distinct users is guaranteed rather than computed: the unique index
 * means one document per (user, story), so `countDocuments({ story, createdAt })`
 * is already a count of unique signed-in accounts, exactly as PRODUCT.md's rule
 * specifies. No `$group` over a distinct set is needed.
 */
likeSchema.index({ story: 1, createdAt: -1 });

// "Stories this reader has appreciated", which the feed excludes so it never
// re-offers something already seen and acted on.
likeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Like ?? mongoose.model('Like', likeSchema);
