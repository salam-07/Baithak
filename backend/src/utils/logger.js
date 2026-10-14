import pino from 'pino';
import env from '../config/env.js';

/**
 * Fields that must never reach a log sink. Structured logging makes accidental
 * disclosure easy — one `logger.info({ body })` on a signup route writes a
 * plaintext password to disk, and logs are typically the least-protected store
 * in a system and the one with the longest retention.
 *
 * pino's redact only matches these paths, so they are listed exhaustively
 * rather than relying on a deep wildcard, which would also hide fields worth
 * keeping.
 */
const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.body.password',
  'req.body.newPassword',
  'req.body.currentPassword',
  'req.body.confirmPassword',
  'req.body.refreshToken',
  'req.body.token',
  'res.headers["set-cookie"]',
  'password',
  'passwordHash',
  'token',
  'refreshToken',
  'accessToken',
  'tokenHash',
  '*.password',
  '*.passwordHash',
  '*.token',
];

const logger = pino({
  level: env.logLevel,
  redact: { paths: REDACTED_PATHS, censor: '[redacted]' },
  // JSON in every environment, including development. pino-pretty would mean a
  // dependency carried into production for a developer convenience, and piping
  // through it with `| pino-pretty` locally gets the same readability for free.
  base: env.isProduction ? { service: 'baithak-api' } : undefined,
  timestamp: pino.stdTimeFunctions.isoTime,
  // Stack traces on error objects are useful; the serializer just makes them
  // show up under a stable key instead of being inlined.
  serializers: {
    err: pino.stdSerializers.err,
  },
});

export default logger;
