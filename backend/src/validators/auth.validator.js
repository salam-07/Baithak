import { z } from 'zod';

import { INTEREST_KINDS } from '../config/constants.js';

/**
 * Sign-up, sign-in and session schemas.
 *
 * The username rules are repeated from the User model rather than imported from
 * it, and that is worth explaining because it looks like duplication. The model
 * pattern is a regex literal inside User.js and is not exported; reaching into
 * the model for it would make the validator depend on the schema's internals.
 * The alternative — deriving one from the other — means a validator that
 * accepts a value the schema then rejects, and the 422/500 split that follows
 * is confusing to whoever hits it. Both are written out, and there is a test
 * asserting they agree.
 */
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_]{2,29}$/;

const username = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'A username must be at least 3 characters.')
  .max(30, 'A username cannot be longer than 30 characters.')
  .regex(
    USERNAME_PATTERN,
    'A username may only use letters, numbers and underscores, and must start with a letter or number.',
  );

/**
 * Never trimmed, and capped at 72.
 *
 * Not trimming is deliberate: leading or trailing spaces are part of what the
 * reader typed, and silently stripping them produces a password that fails on a
 * device that does not.
 *
 * The 72 is bcrypt's own limit. It hashes at most 72 *bytes* and ignores the
 * rest silently, so without a cap two different long passwords would be
 * interchangeable — a reader who changed `…-v2` to `…-v3` past the cutoff would
 * find their old password still worked. Rejecting at the boundary turns that
 * from an invisible equivalence into a message. Note that the cut is in bytes,
 * so a Shahmukhi password reaches it in fewer characters than a Latin one; the
 * cap is on characters and is therefore a loose bound that errs toward
 * rejecting too little rather than too much.
 */
const password = z
  .string()
  .min(8, 'A password must be at least 8 characters.')
  .max(72, 'A password cannot be longer than 72 characters.');

/**
 * Sign-in deliberately applies no pattern to the username.
 *
 * Rejecting a malformed one with a 422 would tell a caller that a string could
 * not be an account, which is a different answer from "that username or
 * password is not correct" — and the whole point of the generic message on the
 * login path is that those two are indistinguishable. Length bounds are kept so
 * that a megabyte of text is not hashed.
 */
const signInUsername = z.string().trim().toLowerCase().min(1).max(30);

/** Chosen at sign-up, validated so the feed has something usable immediately. */
const signupInterest = z.object({
  kind: z.enum(INTEREST_KINDS),
  ref: z.string().trim().min(1).max(80),
  label: z.string().trim().max(80).optional(),
});

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'A name is required.').max(80).optional(),
  username,
  password,
  // Profile details are collected after account creation. Absent when not
  // given, so the profile can tell "not provided" from "cleared".
  location: z.string().trim().max(120).optional(),
  interests: z.array(signupInterest).max(30).optional(),
});

export const loginSchema = z.object({
  username: signInUsername,
  password: z.string().min(1, 'A password is required.').max(200),
});

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, 'A refresh token is required.').max(512),
});

/**
 * Logout takes the token in the body rather than from a header, and tolerates
 * it being absent. An already-signed-out client calling logout again should be
 * a success, not a 422 — the desired end state holds either way.
 */
export const logoutSchema = z.object({
  refreshToken: z.string().trim().max(512).optional(),
});

export default { signupSchema, loginSchema, refreshSchema, logoutSchema };
