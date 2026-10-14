import { z } from 'zod';

import { objectId } from './common.validator.js';

/**
 * Profile schemas.
 *
 * The field list here is the same allowlist `updateProfile` applies, and having
 * it in both places is not redundancy: the schema is what produces a readable
 * 422 when a client sends an unknown field, and the service allowlist is what
 * protects the document if a caller ever bypasses the route. Neither is
 * sufficient alone — a service-only check gives a silent no-op, a
 * validator-only check gives no defence in depth.
 *
 * `username` and `role` are absent from both. Username is the login identifier
 * and changing it needs a confirmation flow that does not exist; role is not a
 * reader's to set.
 */

/**
 * An empty string clears the field.
 *
 * Translated to null rather than stored as `''`, so "no location" is one value
 * in the database instead of two that every reader of the field has to treat
 * alike. `null` is safe on a String path: validators skip it.
 */
const clearableLocation = z
  .string()
  .trim()
  .max(120)
  .transform((value) => (value === '' ? null : value));

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, 'A name is required.').max(80).optional(),
    bio: z
      .string()
      .trim()
      .max(300)
      .transform((value) => (value === '' ? null : value))
      .optional(),
    location: clearableLocation.optional(),
  })
  .refine((body) => Object.keys(body).length > 0, { message: 'Nothing to update.' });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Your current password is required.').max(200),
    // Same 72-character bound as sign-up, and for the same reason — see the
    // note in auth.validator.js on bcrypt's byte limit.
    newPassword: z
      .string()
      .min(8, 'A password must be at least 8 characters.')
      .max(72, 'A password cannot be longer than 72 characters.'),
  })
  .refine((body) => body.newPassword !== body.currentPassword, {
    message: 'The new password must be different from the current one.',
    path: ['newPassword'],
  });

/**
 * Account deletion is confirmed with the password rather than a boolean.
 *
 * A flag would make a stolen access token sufficient to destroy an account, and
 * the only cost of asking is one bcrypt comparison on a route that is used once.
 * The password is not trimmed, for the same reason as everywhere else.
 */
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Your password is required to delete your account.').max(200),
});

export const usernameParamSchema = z.object({
  username: z.string().trim().toLowerCase().min(3).max(30),
});

export const userIdParamSchema = z.object({
  userId: objectId,
});

export default {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  usernameParamSchema,
  userIdParamSchema,
};
