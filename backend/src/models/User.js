import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { USER_ROLE, USER_ROLES, USER_STATUS, USER_STATUSES } from '../config/constants.js';
import { slugify } from '../utils/normalize.js';

const { Schema } = mongoose;

/**
 * Usernames are the login identifier and are constrained to lowercase ASCII.
 *
 * The temptation is to allow Shahmukhi usernames, since that is the script many
 * of these readers think in. It is the wrong call for an identifier people have
 * to type on a phone keyboard: the script is right-to-left, has several letters
 * that look alike in isolation (kaf/gaf, the various heh forms), and offers no
 * way to recover from a typo. Letting people pick `gurdeep_sandhu` and showing
 * their Shahmukhi name as the display name keeps both usable.
 *
 * Mixed case is folded rather than rejected, so typing `Gurdeep` at sign-in
 * works and only one account can ever exist per name.
 */
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,29}$/;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'A name is required.'],
      trim: true,
      maxlength: [80, 'A name cannot be longer than 80 characters.'],
    },

    // Existing accounts are complete; credential-only signup explicitly sets false.
    onboardingCompleted: { type: Boolean, default: true },

    username: {
      type: String,
      required: [true, 'A username is required.'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'A username must be at least 3 characters.'],
      maxlength: [30, 'A username cannot be longer than 30 characters.'],
      validate: {
        validator: (value) => USERNAME_PATTERN.test(value),
        message:
          'A username may only use letters, numbers and underscores, and must start '
          + 'with a letter or number.',
      },
    },

    // Never selected by default. Every query that needs it has to ask
    // explicitly with `.select('+passwordHash')`, which means a forgotten
    // projection cannot leak a hash into an API response — the failure mode is
    // an auth check that errors, not one that quietly returns a credential.
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    /**
     * Free text, optional, and private.
     *
     * Kept as free text rather than a structured country/region/city because
     * the honest answer for this audience is often a village or a tehsil that
     * no administrative dataset names correctly, and forcing a structured pick
     * would collect something less true. `select: false` because a location
     * narrows a person down sharply in a small community, and PRODUCT.md asks
     * that what is public be deliberate — so it is returned only to the account
     * that owns it.
     */
    location: {
      type: String,
      trim: true,
      maxlength: [120, 'A location cannot be longer than 120 characters.'],
      select: false,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [300, 'A bio cannot be longer than 300 characters.'],
    },

    role: {
      type: String,
      enum: { values: USER_ROLES, message: '{VALUE} is not a valid role.' },
      default: USER_ROLE.READER,
    },

    status: {
      type: String,
      enum: { values: USER_STATUSES, message: '{VALUE} is not a valid status.' },
      default: USER_STATUS.ACTIVE,
    },

    // Denormalised so an author's profile does not have to count their stories
    // Keyword counters, which have the same drift risk and the same mitigation:
    // `npm run indexes` does not fix these, so a rebuild script is the recovery
    // path if a write ever fails midway.
    storyCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastActiveAt: Date,
  },
  {
    timestamps: true,
    // `__v` exists to detect array-modification conflicts on documents saved
    // with `.save()`. Nothing here does that: profile writes go through targeted
    // `$set` updates, and story likes through atomic `$inc`/`upsert`. Dropping
    // the field saves a few bytes per document across every collection and
    // keeps the JSON responses clean.
    versionKey: false,
  },
);

// Sign-in looks accounts up by this field, which the unique index already
// covers. The compound index is separate: it serves the "author" filter on the
// story feed, which sorts by publication rather than by name.
userSchema.index({ status: 1, createdAt: -1 });

userSchema.methods.setPassword = async function setPassword(plaintext, rounds) {
  this.passwordHash = await bcrypt.hash(plaintext, rounds);
};

/**
 * bcrypt.compare is deliberately slow, and the result is the only thing that
 * matters — a timing-safe string comparison would be redundant, since the hash
 * comparison inside bcrypt is already constant-time with respect to the digest.
 */
userSchema.methods.verifyPassword = async function verifyPassword(plaintext) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(plaintext, this.passwordHash);
};

/**
 * The shape safe to return about another reader.
 *
 * Written as an allowlist rather than a delete-list. `location` and
 * `passwordHash` are `select: false` so they should not be present to begin
 * with, but a future field added to the schema would otherwise be exposed the
 * moment somebody used the document directly. Naming what is public means the
 * default for anything new is private.
 */
userSchema.methods.toPublicProfile = function toPublicProfile() {
  return {
    id: this._id,
    name: this.name,
    username: this.username,
    bio: this.bio ?? null,
    storyCount: this.storyCount,
    joinedAt: this.createdAt,
  };
};

/**
 * The owner's own view. Adds back the private fields, and is only ever reached
 * through an authenticated route that has already established ownership.
 */
userSchema.methods.toPrivateProfile = function toPrivateProfile() {
  return {
    ...this.toPublicProfile(),
    location: this.location ?? null,
    onboardingCompleted: this.onboardingCompleted !== false,
    role: this.role,
    status: this.status,
    updatedAt: this.updatedAt,
  };
};

/**
 * Derives a username when a client has not chosen one. Used by the seeder and
 * by tests; the signup route always takes the reader's own choice, since the
 * whole point of asking is that the identifier should be something they
 * recognise and can retype.
 */
userSchema.statics.suggestUsername = function suggestUsername(name) {
  return slugify(name).replace(/-/g, '_').slice(0, 30) || 'reader';
};

export default mongoose.models.User ?? mongoose.model('User', userSchema);
