import { fileURLToPath } from 'node:url';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

import { PAGINATION } from './constants.js';

// Resolve `.env` against this file rather than `process.cwd()`. The service is
// started from `backend/` today, but `node src/server.js` from the repo root, a
// pm2 config, or a systemd unit would all otherwise load no environment at all
// and fail on the first missing secret with a confusing error.
const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

dotenv.config({ path: path.join(backendRoot, '.env') });

export const ENV_PATH = path.join(backendRoot, '.env');
export const BACKEND_ROOT = backendRoot;

// Tolerate the handful of shapes a hand-edited .env actually produces. An empty
// assignment (`PORT=`) is the common one: dotenv yields `''`, which is *present*
// but useless, and an unguarded `Number('')` downstream becomes 0 — a port, a
// limit or a TTL silently set to zero. Treat blank as absent everywhere so the
// documented default applies instead.
const optional = (schema) =>
  z.preprocess((value) => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'string' && value.trim() === '') return undefined;
    return value;
  }, schema.optional());

const booleanish = z
  .union([z.boolean(), z.string()])
  .transform((value) =>
    typeof value === 'boolean' ? value : ['1', 'true', 'yes', 'on'].includes(value.toLowerCase()));

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required — see .env.example'),

  // Presence is mandatory; strength is not enforced here. An .env that already
  // works must keep booting, so a short secret produces a loud warning (see
  // `warnings` below) rather than a refusal to start.
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required — see .env.example'),

  PORT: optional(z.coerce.number().int().positive().max(65535)),

  CORS_ORIGINS: optional(z.string()),

  ACCESS_TOKEN_TTL: optional(z.string()),
  REFRESH_TOKEN_TTL: optional(z.string()),

  // Below 10 a modern GPU walks a bcrypt hash in hours. Above 14 login latency
  // becomes visible on the modest phones this product targets.
  BCRYPT_ROUNDS: optional(z.coerce.number().int().min(10).max(14)),

  MAX_PAGE_SIZE: optional(z.coerce.number().int().min(1).max(200)),
  FEED_WINDOW_DAYS: optional(z.coerce.number().int().min(1).max(3650)),
  KEYWORD_CACHE_TTL: optional(z.coerce.number().int().min(0)),

  RATE_LIMIT_MAX: optional(z.coerce.number().int().min(1)),
  AUTH_RATE_LIMIT_MAX: optional(z.coerce.number().int().min(1)),

  LOG_LEVEL: optional(z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])),

  TRUST_PROXY: optional(booleanish),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Print only the field names and messages. `parsed.error` can echo the
  // received value, and for JWT_SECRET or MONGODB_URI that value is the secret
  // itself — a validation crash must not be the thing that leaks it into a log
  // aggregator.
  const problems = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');

  throw new Error(
    `Invalid environment configuration (checked ${ENV_PATH}):\n${problems}\n\n`
    + 'See .env.example for the full list of variables and their defaults.',
  );
}

const raw = parsed.data;
const isProduction = raw.NODE_ENV === 'production';
const isTest = raw.NODE_ENV === 'test';

// Non-fatal configuration problems, surfaced by the logger at boot. These are
// things that work but are wrong enough to deserve saying out loud, as distinct
// from the hard failures above that stop the process.
const warnings = [];

const MIN_SECRET_LENGTH = 32;

if (raw.JWT_SECRET.length < MIN_SECRET_LENGTH) {
  warnings.push(
    `JWT_SECRET is only ${raw.JWT_SECRET.length} characters. Short HS256 secrets are `
    + 'brute-forceable offline if a token is ever leaked. Generate one with:\n'
    + '  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
  );
}

// Reflecting any origin in production would let any site call the API with the
// reader's credentials attached.
if (isProduction && !raw.CORS_ORIGINS) {
  warnings.push('CORS_ORIGINS is unset in production; cross-origin browser requests will be denied.');
}

const env = Object.freeze({
  nodeEnv: raw.NODE_ENV,
  isProduction,
  isTest,
  isDevelopment: raw.NODE_ENV === 'development',

  port: raw.PORT ?? 5000,

  mongoUri: raw.MONGODB_URI,

  jwt: Object.freeze({
    /**
     * One secret, not two.
     *
     * An earlier draft signed refresh tokens with a separate key, which is the
     * usual advice and is wrong here for a specific reason: refresh tokens in
     * this design are opaque random bytes stored as a hash, not JWTs. There is
     * nothing to sign them with, so a second key would have been a documented
     * variable with no effect — worse than not having it, because it invites
     * the belief that rotating it does something.
     *
     * The concern a separate key usually addresses still holds, and is handled
     * differently: a leaked access token cannot be replayed as a refresh token,
     * because the refresh path looks the value up in the database and an access
     * token is not there. See `typ` in token.service.js for the other half.
     */
    secret: raw.JWT_SECRET,
    accessTtl: raw.ACCESS_TOKEN_TTL ?? '15m',
    refreshTtl: raw.REFRESH_TOKEN_TTL ?? '30d',
  }),

  bcryptRounds: raw.BCRYPT_ROUNDS ?? 12,

  pagination: Object.freeze({
    // Two different numbers on purpose. `defaultLimit` is what the client gets
    // when it does not ask, and is sized so one page fills a phone screen
    // without a second request. `maxPageSize` is the ceiling a hostile client
    // can request, and caps how much work one query can be made to do.
    //
    // The defaults come from constants.js rather than being written again here,
    // because `parseLimit` reads the values below and the validators read the
    // constants — two literals would be two answers to the same question.
    defaultLimit: PAGINATION.DEFAULT_LIMIT,
    maxPageSize: raw.MAX_PAGE_SIZE ?? PAGINATION.MAX_LIMIT,
  }),

  feed: Object.freeze({
    windowDays: raw.FEED_WINDOW_DAYS ?? 180,
    // How many of the reader's interests participate in ranking. Bounds the
    // scoring arrays to a known size regardless of how long they have used the
    // platform, which keeps the $setIntersection cost flat.
    maxInterests: 50,
    // PRODUCT.md fixes this window for the "popular this week" rule; it is not
    // a tuning knob, so it lives here rather than in .env.
    popularWindowDays: 7,
  }),

  keywordCacheTtlMs: (raw.KEYWORD_CACHE_TTL ?? 300) * 1000,

  rateLimit: Object.freeze({
    windowMs: 15 * 60 * 1000,
    max: raw.RATE_LIMIT_MAX ?? 300,
    authMax: raw.AUTH_RATE_LIMIT_MAX ?? 20,
  }),

  corsOrigins: raw.CORS_ORIGINS
    ? raw.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [],

  // Behind a load balancer or a PaaS router, req.ip is the proxy's address
  // unless Express is told to trust the forwarding header. That makes the rate
  // limiter bucket every user together — so this is opt-in rather than guessed,
  // since trusting the header while directly internet-facing lets any client
  // forge its own IP and bypass the limiter entirely.
  trustProxy: raw.TRUST_PROXY ?? isProduction,

  logLevel: raw.LOG_LEVEL ?? (isTest ? 'silent' : 'info'),
});

export { warnings };

export default env;
