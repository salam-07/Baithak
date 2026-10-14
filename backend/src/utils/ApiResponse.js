/**
 * A single envelope for every successful response, so a client never has to
 * work out whether it is looking at a bare array, a wrapped object, or a list
 * with a cursor attached. `meta` is where pagination and any explanation of
 * *why* a result looks the way it does belong.
 */
export function sendSuccess(res, data, { statusCode = 200, meta } = {}) {
  const body = { success: true, data };
  if (meta !== undefined) body.meta = meta;

  return res.status(statusCode).json(body);
}

export function sendCreated(res, data, meta) {
  return sendSuccess(res, data, { statusCode: 201, meta });
}

/**
 * 204 responses must have no body at all — sending `{ success: true }` with a
 * 204 is technically malformed and some clients discard or error on it.
 */
export function sendNoContent(res) {
  return res.status(204).end();
}
