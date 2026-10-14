import asyncHandler from '../utils/asyncHandler.js';
import { sendSuccess, sendCreated } from '../utils/ApiResponse.js';
import * as interestService from '../services/interest.service.js';

/**
 * The reader's interest profile.
 *
 * Every route here is scoped to the caller, and the user id always comes from
 * `req.auth` — never from a parameter, never from the body. That is what makes
 * it impossible for one reader to edit what another is shown, which is the only
 * thing this feature could seriously get wrong.
 */

/**
 * The shape a client sees.
 *
 * `user` and `_id` are dropped because they are the caller's own id and an
 * internal key respectively, and neither is something a profile screen has a
 * use for. Everything kept is what the screen needs to render a row and offer
 * to remove it — including `blocked`, so a reader can tell a suppressed
 * interest from one that is merely weak rather than wondering why the removal
 * they performed is not showing.
 */
function toInterest(row) {
  return {
    kind: row.kind,
    ref: row.ref,
    label: row.label,
    weight: row.weight,
    // Stated rather than implied by the weight, because they answer different
    // questions: a row can have been added by hand (manual) and later suppressed
    // (blocked), and the screen needs both to explain itself.
    source: row.source,
    blocked: Boolean(row.blocked),
    lastSignalAt: row.lastSignalAt ?? null,
  };
}

export const listInterests = asyncHandler(async (req, res) => {
  const rows = await interestService.listInterests(req.auth.userId, {
    kind: req.query.kind,
    // The service defaults to including suppressed rows. This is the owner's own
    // view, and hiding them would make a removal look like a deletion that
    // silently failed to happen.
    includeBlocked: req.query.includeBlocked ?? true,
  });

  return sendSuccess(res, rows.map(toInterest));
});

export const addInterest = asyncHandler(async (req, res) => {
  const interest = await interestService.addInterest({
    userId: req.auth.userId,
    kind: req.body.kind,
    ref: req.body.ref,
    label: req.body.label,
  });

  return sendCreated(res, toInterest(interest));
});

/**
 * A 200 carrying the resulting state, not a 204.
 *
 * Removing is implemented as suppression rather than deletion — see the service
 * for why — so the row still exists and its new state is worth returning. A 204
 * would leave the client guessing whether the row it just removed now looks
 * blocked or is simply absent.
 */
export const removeInterest = asyncHandler(async (req, res) => {
  const result = await interestService.removeInterest({
    userId: req.auth.userId,
    kind: req.body.kind,
    ref: req.body.ref,
  });

  return sendSuccess(res, result);
});

export default { listInterests, addInterest, removeInterest };
