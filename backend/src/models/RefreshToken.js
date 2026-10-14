import mongoose from 'mongoose';

const { Schema } = mongoose;

/**
 * A refresh token, stored as a hash and rotated on every use.
 *
 * Storing the hash rather than the token follows the same reasoning as a
 * password: a refresh token is a long-lived credential, and a database leak
 * should not hand an attacker a set of usable sessions. The token itself is the
 * only copy its holder has; this collection can verify one but cannot produce
 * one.
 *
 * `family` implements reuse detection, which is the part worth understanding.
 * A refresh token is single-use — using it returns a new one and revokes the
 * old. If a token that has already been rotated is presented again, one of two
 * things is true: the reader's client retried a request it had already
 * completed, or somebody stole the token and is using it in parallel. The two
 * are indistinguishable from here, and only one of them is benign.
 *
 * Faced with that, the safe answer is to assume theft. Every token in the
 * family is revoked, which logs out both the thief and the reader — the reader
 * signs in again, which is a small cost, and the thief is left with nothing,
 * which is the point. Anything less forgiving lets an attacker who captured a
 * token ride along indefinitely, since the legitimate user's continued use
 * keeps minting fresh tokens for both of them.
 */
const refreshTokenSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    /**
     * SHA-256 of the token, hex encoded.
     *
     * SHA-256 rather than bcrypt here, and the difference is deliberate. Bcrypt
     * exists to make guessing a *low-entropy* secret expensive; a refresh token
     * is 48 bytes of CSPRNG output, so there is nothing to guess and the only
     * property needed is that the stored value cannot be reversed. Bcrypt would
     * add ~300ms to every refresh for no security gain, on the one endpoint a
     * client calls constantly.
     */
    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    /**
     * All tokens descended from one sign-in, so a detected replay can revoke
     * the whole lineage rather than just the one token the attacker used. A
     * random id generated at sign-in, not derived from the token.
     */
    family: {
      type: String,
      required: true,
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    /**
     * The hash of the token this one was rotated into. Chain rather than
     * overwrite, so a replay can be traced back to the rotation it skipped —
     * which is what makes a false positive debuggable instead of just a
     * mysterious logout.
     */
    replacedByHash: {
      type: String,
      default: null,
    },

    /**
     * Both recorded for the "sessions" screen and for abuse investigation.
     * Neither is used for authorisation decisions, which is the important part:
     * a client can lie about either, so they are evidence, not identity.
     */
    userAgent: {
      type: String,
      maxlength: 400,
    },

    ip: {
      type: String,
      maxlength: 60,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  },
);

/**
 * TTL index: Mongo deletes each document once `expiresAt` passes.
 *
 * This is housekeeping, not enforcement. The background task that does the
 * deleting runs about once a minute, so a token can outlive its expiry by that
 * much — which is why every verification also compares `expiresAt` in
 * application code and never trusts the document's mere existence.
 *
 * `revokedAt` is not what this index reads: a revoked token is kept until its
 * natural expiry so that a replay is still recognisable as a replay. Deleting
 * it immediately would make a replayed token look like an unknown one, turning
 * a detectable theft into an ordinary auth failure.
 */
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Revoking a whole family on a detected replay, and listing a reader's sessions.
refreshTokenSchema.index({ family: 1 });
refreshTokenSchema.index({ user: 1, createdAt: -1 });

refreshTokenSchema.methods.isUsable = function isUsable(now = new Date()) {
  if (this.revokedAt) return false;
  return this.expiresAt > now;
};

export default mongoose.models.RefreshToken ?? mongoose.model('RefreshToken', refreshTokenSchema);
