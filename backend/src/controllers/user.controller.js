import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/ApiResponse.js';
import * as userService from '../services/user.service.js';
import * as storyService from '../services/story.service.js';

/**
 * Reader profiles.
 *
 * The split between this controller and the story one is deliberate: an
 * author's stories are listed through `storyService.listStories` with an author
 * filter, not through the owner-scoped listing. That is what keeps drafts out
 * of a public profile — the filter forces `status: published` and there is no
 * parameter a client can send to relax it.
 */

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getPublicProfile({ username: req.params.username });
  return sendSuccess(res, profile);
});

/**
 * The caller's own profile.
 *
 * Read off `req.user`, which `requireAuth` already loaded with the fields
 * `toPrivateProfile` needs. It is a different function from `getProfile` rather
 * than a branch inside it because the two return genuinely different things —
 * one is a public view allowlisted down to a display name and a story count,
 * the other adds the location and role that are withheld from everyone else.
 */
export const getOwnProfile = asyncHandler(async (req, res) =>
  sendSuccess(res, req.user.toPrivateProfile()));

export const getProfileStories = asyncHandler(async (req, res) => {
  // Resolved first so that a reader who does not exist gets a 404 rather than
  // an empty list — otherwise a typo in a username and a reader with nothing
  // published look identical.
  const profile = await userService.getPublicProfile({ username: req.params.username });

  const { items, meta } = await storyService.listStories({
    filters: { author: String(profile.id) },
    cursor: req.query.cursor,
    limit: req.query.limit,
    viewerId: req.auth?.userId,
  });

  return sendSuccess(res, items, { meta });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const profile = await userService.updateProfile({
    userId: req.auth.userId,
    updates: req.body,
  });

  return sendSuccess(res, profile);
});

/**
 * Changing a password ends every session, including this one.
 *
 * Returned as a count rather than a bare confirmation, because the client has
 * to sign the reader back in and telling them how many devices were signed out
 * is how they find out that was going to happen.
 */
export const changePassword = asyncHandler(async (req, res) => {
  const result = await userService.changePassword({
    userId: req.auth.userId,
    currentPassword: req.body.currentPassword,
    newPassword: req.body.newPassword,
  });

  return sendSuccess(res, result);
});

export const deleteAccount = asyncHandler(async (req, res) => {
  const result = await userService.deleteAccount({
    userId: req.auth.userId,
    password: req.body.password,
  });

  return sendSuccess(res, result);
});

export default {
  getProfile,
  getOwnProfile,
  getProfileStories,
  updateProfile,
  changePassword,
  deleteAccount,
};
