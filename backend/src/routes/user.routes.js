import { Router } from 'express';

import validate from '../middlewares/validate.js';
import { requireAuth, optionalAuth } from '../middlewares/auth.js';
import * as userController from '../controllers/user.controller.js';
import interestRouter from './interest.routes.js';
import {
  updateProfileSchema,
  changePasswordSchema,
  deleteAccountSchema,
  usernameParamSchema,
} from '../validators/user.validator.js';
import { listByAuthorQuerySchema } from '../validators/story.validator.js';

/**
 * Reader profiles.
 *
 * Registration order is the thing to be careful about here. `/me` is a literal
 * path and `/:username` is a pattern, so every `/me` route has to be declared
 * first — otherwise a request for your own profile is read as a request for a
 * reader called "me", and it fails with a 404 about a nonexistent reader, which
 * is a genuinely confusing message to receive about your own account.
 */

const router = Router();

/** `/users/me/interests` — the reader's own affinity store. */
router.use('/me/interests', interestRouter);

/**
 * The signed-in reader's own profile.
 *
 * The one place that returns the private fields — location and role. It goes
 * through `toPrivateProfile`, which is an allowlist, so a field added to the
 * schema later is private by default rather than exposed by omission.
 */
router.get('/me', requireAuth, userController.getOwnProfile);

router.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  userController.updateProfile,
);

/**
 * A password change ends every session, so the response tells the client how
 * many were ended. It has to sign the reader back in, and it should say why.
 */
router.post(
  '/me/password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  userController.changePassword,
);

/**
 * Account deletion, confirmed with the password.
 *
 * A long-lived or stolen access token is not enough on its own, which is the
 * point of asking: this is the one operation in the API that cannot be undone
 * and cannot be re-authenticated out of.
 */
router.delete(
  '/me',
  requireAuth,
  validate({ body: deleteAccountSchema }),
  userController.deleteAccount,
);

/** A reader's public profile. Location and role are absent by construction. */
router.get(
  '/:username',
  optionalAuth,
  validate({ params: usernameParamSchema }),
  userController.getProfile,
);

/**
 * Their published stories.
 *
 * Routed through the public story listing with an author filter rather than the
 * owner-scoped one, so drafts cannot appear here. See the note in
 * user.controller.js.
 */
router.get(
  '/:username/stories',
  optionalAuth,
  validate({ params: usernameParamSchema, query: listByAuthorQuerySchema }),
  userController.getProfileStories,
);

export default router;
