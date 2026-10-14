/**
 * Express 5 forwards rejected promises from handlers to the error middleware on
 * its own, so this is no longer strictly required. It is kept because the
 * layering rule for this codebase is that every controller is wrapped in it:
 * the guarantee then holds even if a handler is later mounted on an Express 4
 * app or called directly from a test, and it costs one function call.
 *
 * Deliberately not exported as a curried `catchAsync(fn)(req,res,next)` — the
 * direct form keeps the stack trace anchored to the real handler.
 */
export default function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    return Promise.resolve(fn(req, res, next)).catch(next);
  };
}
