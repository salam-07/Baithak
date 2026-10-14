import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

/**
 * One place that decides what a failure looks like.
 *
 * The rule it enforces is that a caller is told what we decided to tell them and
 * nothing else. An `ApiError` was authored for a reader of the API, so its
 * message and details are forwarded. Anything else — a driver error, a bug, a
 * thrown string — is a 500 with a fixed message, and the real error goes to the
 * log. Without that split, an unexpected failure leaks a stack trace, a
 * connection string, or a query fragment to whoever asked.
 *
 * The error body is the same envelope shape as a success, so a client has one
 * branch to write rather than two.
 */

/** 404 for any route that reached the end of the stack without matching. */
export function notFoundHandler(req, res, next) {
  next(ApiError.notFound('Endpoint'));
}

/**
 * Translates the errors Mongoose and Express actually throw into the same
 * vocabulary as `ApiError`.
 *
 * These matter more than they look. A Mongoose ValidationError reaches us as a
 * 500 by default, which tells a client their request was fine and the server
 * broke — when in fact the request was the problem and the schema said so
 * precisely. Mapping them means the difference between a client that can fix
 * the request and one that retries it.
 */
function translate(error) {
  if (error instanceof ApiError) return error;

  // Mongoose validation. Only the messages are forwarded, never the paths'
  // values: a validation error on a password field would otherwise echo the
  // password back in the response body.
  if (error?.name === 'ValidationError' && error.errors) {
    const details = Object.entries(error.errors).map(([field, issue]) => ({
      field,
      message: issue?.message ?? 'Is not valid.',
    }));

    return ApiError.validation('Some fields need attention.', details);
  }

  // A malformed id reaching a query. Validators catch most of these; this is the
  // backstop for the paths that do not have one.
  if (error?.name === 'CastError') {
    return ApiError.badRequest(`\`${error.path}\` is not a valid value.`);
  }

  // The unique index doing its job. Anywhere this reaches the handler without
  // being caught closer to the write, the honest answer is that the value
  // already exists.
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? {})[0];
    return ApiError.conflict(
      field ? `That ${field} is already taken.` : 'That already exists.',
    );
  }

  // Body parser failures. Both are the client's request being malformed, so
  // neither should be a 500.
  if (error?.type === 'entity.parse.failed') {
    return ApiError.badRequest('The request body is not valid JSON.');
  }

  if (error?.type === 'entity.too.large') {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', 'That request is too large.');
  }

  return null;
}

// eslint-disable-next-line no-unused-vars -- Express identifies the error handler by arity
export function errorHandler(error, req, res, next) {
  const translated = translate(error);

  if (translated) {
    // Logged below the error level for a 4xx: a client sending a bad request is
    // ordinary traffic, and logging it as a failure would bury the real ones.
    if (translated.statusCode >= 500) {
      logger.error({ err: error, reqId: req.id, path: req.originalUrl }, 'Request failed');
    } else {
      logger.debug(
        { code: translated.code, reqId: req.id, path: req.originalUrl },
        'Request rejected',
      );
    }

    return res.status(translated.statusCode).json({
      success: false,
      error: {
        code: translated.code,
        message: translated.message,
        ...(translated.details ? { details: translated.details } : {}),
      },
    });
  }

  // Unrecognised. Full detail to the log, nothing to the caller.
  logger.error({ err: error, reqId: req.id, path: req.originalUrl }, 'Unhandled error');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong on our end.',
      // The one concession, and only outside production: a developer running the
      // service locally needs the message to know where to look, and there is no
      // third party to leak it to.
      ...(env.isProduction ? {} : { detail: error?.message ?? String(error) }),
    },
  });
}

export default { notFoundHandler, errorHandler };
