import ApiError from '../utils/ApiError.js';
import { toValidationDetails } from '../validators/common.validator.js';

/**
 * Runs zod schemas over the request and replaces each part with the parsed
 * result.
 *
 * Replacing rather than merely checking is the point. The parsed object has the
 * schema's unknown keys removed, the coercions applied and the defaults filled
 * in, so everything downstream — controllers, services, queries — sees one
 * shape. A validator that only returned a boolean would leave the raw body in
 * place, and the raw body is what carries `$where` and `$ne`.
 *
 * The parsed value is installed with `Object.defineProperty` rather than a plain
 * assignment. Express 5 defines `query` as a getter on the request prototype, so
 * `req.query = parsed` throws in strict mode — and every ESM module is strict,
 * which makes this fail loudly in development but only on the routes that
 * happen to validate a query. An own property shadows the prototype accessor
 * instead, which works whether or not a setter exists.
 */
export function assignPart(req, part, value) {
  Object.defineProperty(req, part, {
    value,
    writable: true,
    enumerable: true,
    configurable: true,
  });
}

/**
 * @param {{ body?: object, query?: object, params?: object }} schemas
 *   zod schemas, one per request part. A part with no schema is left untouched.
 */
export default function validate(schemas) {
  return function validateRequest(req, res, next) {
    try {
      for (const part of ['params', 'query', 'body']) {
        const schema = schemas[part];
        if (!schema) continue;

        // Express 5 leaves `req.body` undefined when nothing was parsed, rather
        // than the empty object v4 produced. Passing `{}` keeps a missing body
        // reporting as missing fields instead of as a type error about
        // `undefined`.
        const result = schema.safeParse(req[part] ?? {});

        if (!result.success) {
          throw ApiError.validation(
            'Some fields need attention.',
            toValidationDetails(result.error),
          );
        }

        assignPart(req, part, result.data);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
