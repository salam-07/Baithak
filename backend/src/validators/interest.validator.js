import { z } from 'zod';

import { INTEREST_KINDS } from '../config/constants.js';
import { booleanQuery } from './common.validator.js';

/**
 * The reader's own interest profile.
 *
 * Everything here is about the signed-in reader and nobody else — there is no
 * route that takes a user id, and that is a design choice rather than an
 * omission. An endpoint that edited another reader's interests would be a way
 * to steer what somebody else is shown, which is the one thing this feature
 * must never allow.
 */


const ref = z.string().trim().min(1, 'An interest needs a value.').max(80);

export const addInterestSchema = z.object({
  kind: z.enum(INTEREST_KINDS),
  ref,
  // Optional, and overridden for keywords: an interest labelled from
  // client-supplied text could disagree with the cultural index, and the
  // profile would then show a name the keyword page does not use.
  label: z.string().trim().max(80).optional(),
});

export const removeInterestSchema = z.object({
  kind: z.enum(INTEREST_KINDS),
  ref,
});

export const listInterestsQuerySchema = z.object({
  kind: z.enum(INTEREST_KINDS).optional(),
  // Defaults to true in the service. Passed as a real boolean rather than the
  // string "false", which is truthy — see the note on `booleanQuery`.
  includeBlocked: booleanQuery.optional(),
});

export default { addInterestSchema, removeInterestSchema, listInterestsQuerySchema };
