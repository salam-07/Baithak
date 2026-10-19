import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import env from './config/env.js';
import logger from './utils/logger.js';
import { isDatabaseReady } from './config/db.js';
import sanitize from './middlewares/sanitize.js';
import { apiLimiter } from './middlewares/rateLimit.js';
import { notFoundHandler, errorHandler } from './middlewares/error.js';
import apiRoutes from './routes/index.js';

/**
 * The Express application, assembled but not started.
 *
 * `listen()` is deliberately not called here. Keeping the app and the process
 * apart is what makes the whole thing testable — a test can `import` this and
 * drive it with supertest or a real socket without a port being bound and
 * without the database being connected. `server.js` is the file that owns the
 * process; this one owns the request pipeline.
 */

const app = express();

/**
 * Proxy trust, resolved here rather than passed through as a boolean.
 *
 * Express treats `trust proxy: true` as "believe the leftmost address in
 * X-Forwarded-For", and that leftmost address is client-supplied — so behind a
 * single proxy it lets any caller claim any IP, which defeats the rate limiter
 * entirely and makes the recorded IP on a session worthless. Express's own
 * rate-limiting middleware refuses to run under it for that reason.
 *
 * `1` means "trust exactly one hop", which is the correct setting for one
 * reverse proxy or PaaS router: the address one step in from the connection is
 * the one the proxy itself observed, and the earlier entries in the header are
 * not believed. Deployments with a different topology set TRUST_PROXY
 * explicitly — see the note in config/env.js.
 */
app.set('trust proxy', env.trustProxy === true ? 1 : env.trustProxy);

// Not advertising the framework is free, and it removes one detail from the
// fingerprint of everything exposed to the internet.
app.disable('x-powered-by');

app.use(
  helmet({
    // Preserve the existing Helmet policy for the API and bundled frontend.
    contentSecurityPolicy: false,
  }),
);

/**
 * Cross-origin access, from an explicit allowlist.
 *
 * An empty list means no browser origin is permitted, which is the right
 * default rather than a permissive one: a request from a tool or another server
 * is unaffected by CORS, so an empty list costs a server-to-server client
 * nothing and closes the browser case completely. Development is the one place
 * a list would be tedious, so it is permitted wholesale when NODE_ENV is
 * development and no list is configured — and never in production.
 *
 * `credentials` stays off, and that is not an oversight. Sessions are bearer
 * tokens in an `Authorization` header, not cookies, so nothing needs to be sent
 * implicitly. Leaving it off means a misconfigured origin cannot make a browser
 * attach anything on the reader's behalf.
 */
const allowAnyOrigin = env.isDevelopment && env.corsOrigins.length === 0;

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: a same-origin request, a curl, or a server-to-server
      // call. CORS does not apply, so it is allowed through.
      if (!origin) return callback(null, true);
      if (allowAnyOrigin) return callback(null, true);

      if (env.corsOrigins.includes(origin)) return callback(null, true);

      // Rejected without an error, so the browser applies its own same-origin
      // policy and the response is simply unreadable. Throwing here would turn
      // it into a 500, which tells a probe that the origin was recognised and
      // refused rather than merely absent from the list.
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  }),
);

app.use(compression());

/**
 * One megabyte, chosen from the largest legitimate body.
 *
 * Four text variants at the 50,000-character cap is 200,000 characters, and
 * Shahmukhi costs two to three bytes each in UTF-8 — so the honest ceiling is
 * a little under 600KB. Anything smaller would reject a story that is within
 * the limits the API documents, which is the worst kind of limit: one that
 * disagrees with the one the reader was told about.
 */
app.use(express.json({ limit: '1mb' }));

/**
 * Request logging, with health checks excluded.
 *
 * An orchestrator probes `/health` every few seconds, and logging each one
 * buries everything else. The `err` serializer and the redaction paths are on
 * the logger itself — see utils/logger.js — so a request that fails is recorded
 * with its error and no request is recorded with a password or a token in it.
 */
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url.startsWith('/health?'),
    },
  }),
);

/**
 * Operator injection, stripped before anything reads the request.
 *
 * Placed before validation rather than after, so it also covers the routes
 * whose schemas do not exist yet — the ones somebody will add later. It does
 * not replace the schemas: those allowlist fields, this removes keys that would
 * be interpreted as operators, and they fail in different directions.
 */
app.use(sanitize);

/**
 * The general ceiling, on everything under the API prefix.
 *
 * Scoped to `/api/v1` rather than applied globally, which is what keeps
 * orchestrator health checks out of the rate limiter: `/health` is not under
 * this mount, so it is never counted. Counting it would eventually throttle the
 * thing that decides whether to restart the service.
 *
 * The version segment is here, in one place, and not in routes/index.js. That
 * is what the note at the top of that file means by "the version lives in one
 * place": a v2 is a second router mounted at `/api/v2` alongside this one, with
 * no change to the v1 files at all. It also has to match `apiBase` in the root
 * handler below, which is the only place a client is told where the API is.
 */
app.use('/api/v1', apiLimiter, apiRoutes);

/**
 * Liveness and readiness in one endpoint.
 *
 * A single endpoint rather than two because the distinction does not matter to
 * this deployment: the process serves nothing useful without the database, so
 * "the process is up" and "the service is up" are the same question. A 503 when
 * the database is unreachable is what lets a load balancer take the instance
 * out of rotation instead of routing traffic into failures.
 *
 * It reports only what an operator needs and nothing about configuration —
 * which is why `warnings` from env.js is logged at boot rather than exposed
 * here.
 */
app.get('/health', (req, res) => {
  const database = isDatabaseReady();

  res.status(database ? 200 : 503).json({
    success: database,
    data: {
      status: database ? 'ok' : 'degraded',
      database: database ? 'connected' : 'disconnected',
      uptimeSeconds: Math.round(process.uptime()),
      environment: env.nodeEnv,
    },
  });
});

// Resolve from this module so serving works regardless of the working directory.
const frontendDist = fileURLToPath(new URL('../../frontend/dist/', import.meta.url));
const frontendIndex = path.join(frontendDist, 'index.html');
if (existsSync(frontendIndex)) {
  // Unknown API endpoints must retain their JSON 404 response.
  app.use('/api', notFoundHandler);
  // Vite filenames contain a content hash; only these assets are immutable.
  // Keep HTML revalidated so a deployment always points at the current bundle.
  app.use('/assets', express.static(path.join(frontendDist, 'assets'), { maxAge: '1y', immutable: true }));
  app.use(express.static(frontendDist));
  app.get('/{*splat}', (req, res, next) => {
    // Missing assets should be 404s, not HTML returned as JavaScript or CSS.
    if (path.extname(req.path) || !req.accepts('html')) return next();
    res.sendFile(frontendIndex);
  });
}
// Keep the API description available when the frontend has not been built.
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Baithak API',
      version: 'v1',
      apiBase: '/api/v1',
      health: '/health',
      documentation: 'backend/BACKEND.md',
    },
  });
});

// Order matters: the catch-all turns an unmatched path into a 404 in the same
// envelope as everything else, and the error handler is last so that both it
// and every rejected promise above land in one place.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
