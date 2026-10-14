/**
 * Every error the API raises deliberately goes through this class. The point is
 * that the error handler can then distinguish "we decided to return 404" from
 * "a driver threw", and only the first of those is safe to show a caller.
 *
 * `code` is a stable machine-readable string, separate from the HTTP status, so
 * clients can branch on something that survives copy changes. `details` carries
 * field-level information for validation failures.
 */
export default class ApiError extends Error {
  constructor(statusCode, code, message, details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    if (details !== undefined) this.details = details;

    // Marks the error as one we authored, so the handler does not have to
    // guess from the status code whether the message is safe to forward.
    this.isOperational = true;

    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'The request could not be understood.', details) {
    return new ApiError(400, 'BAD_REQUEST', message, details);
  }

  static unauthorized(message = 'Sign in to continue.') {
    return new ApiError(401, 'UNAUTHORIZED', message);
  }

  static forbidden(message = 'You do not have access to this.') {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(resource = 'Resource') {
    return new ApiError(404, 'NOT_FOUND', `${resource} not found.`);
  }

  static conflict(message = 'That already exists.', details) {
    return new ApiError(409, 'CONFLICT', message, details);
  }

  static validation(message = 'Some fields need attention.', details) {
    return new ApiError(422, 'VALIDATION_ERROR', message, details);
  }

  static tooManyRequests(message = 'Too many requests. Please slow down.') {
    return new ApiError(429, 'TOO_MANY_REQUESTS', message);
  }

  static internal(message = 'Something went wrong on our end.') {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }

  static serviceUnavailable(message = 'The service is temporarily unavailable.') {
    return new ApiError(503, 'SERVICE_UNAVAILABLE', message);
  }
}
