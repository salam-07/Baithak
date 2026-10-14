import app from './app.js';
import env, { warnings } from './config/env.js';
import logger from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

/**
 * The process.
 *
 * Everything here is about lifecycle rather than requests, which is why it is
 * separate from app.js: this file is the only one that knows about ports,
 * signals, and the fact that the process can end.
 */

/**
 * A bounded wait for in-flight requests, then the database, then exit.
 *
 * The order is the point. Closing the HTTP server first stops new connections
 * while letting the requests already being served finish — a reader midway
 * through publishing a story should not lose it because a deploy rolled. The
 * database closes after, once nothing can still be querying it. Reversing the
 * two would fail every in-flight request with a connection error at exactly the
 * moment the service was trying to behave well.
 *
 * The timeout exists because "let requests finish" has no natural end if a
 * request is stuck, and a process that will not die is worse for a rolling
 * deploy than one that drops a straggler.
 */
const SHUTDOWN_TIMEOUT_MS = 15_000;

let shuttingDown = false;

async function shutdown(signal, server) {
  // A second signal during shutdown is a person or a supervisor losing
  // patience. Treated as "stop being graceful" rather than as a no-op, since
  // the alternative is a process that ignores an explicit request to stop.
  if (shuttingDown) {
    logger.warn({ signal }, 'Forced exit during shutdown');
    process.exit(1);
  }

  shuttingDown = true;
  logger.info({ signal }, 'Shutting down');

  const forceExit = setTimeout(() => {
    logger.error({ signal, timeoutMs: SHUTDOWN_TIMEOUT_MS }, 'Shutdown timed out; exiting');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  // `unref` so a process that finishes cleanly is not held open by this timer.
  forceExit.unref();

  try {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

    await disconnectDatabase();

    clearTimeout(forceExit);
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    process.exit(1);
  }
}

import { startKeywordIndexer } from './services/keyword-metadata.service.js';

async function start() {
  // Configuration problems that are not fatal — a short JWT secret, no CORS
  // list in production. Logged at boot rather than checked at request time, so
  // they are seen by whoever deployed rather than by whoever is unlucky.
  for (const warning of warnings) logger.warn(warning);

  try {
    await connectDatabase();
  } catch (error) {
    // Fatal, and deliberately so. `bufferCommands` is off, so a query issued
    // without a connection fails immediately rather than queueing — meaning a
    // server that started anyway would answer every request with an error while
    // looking healthy to whatever supervises it.
    logger.fatal(
      { err: error, uri: redactMongoUri(env.mongoUri) },
      'Could not connect to MongoDB; refusing to start',
    );
    process.exit(1);
  }

  startKeywordIndexer();
  const server = app.listen(env.port, () => {
    logger.info(
      { port: env.port, environment: env.nodeEnv },
      `Baithak API listening on http://localhost:${env.port}`,
    );
  });

  // Node's default keep-alive is long enough that a proxy can hand a connection
  // to this process and have it closed underneath. Keeping it under the usual
  // 60-second proxy timeout avoids that race.
  server.keepAliveTimeout = 55_000;
  server.headersTimeout = 60_000;

  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => shutdown(signal, server));
  }
}

/**
 * Shows only the host and database name from a connection string.
 *
 * A MongoDB URI carries the username and password in its authority section, and
 * an unhandled connection failure is exactly the moment somebody dumps the
 * error into a log aggregator. This strips the credentials before anything is
 * written, keeping enough of the string to tell which cluster it failed to
 * reach.
 */
function redactMongoUri(uri) {
  try {
    const parsed = new URL(uri);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`;
  } catch {
    return '(unparseable connection string)';
  }
}

/**
 * A rejected promise nobody handled is a bug, not a request failure.
 *
 * Logged and then ignored rather than exiting, because the realistic cause in a
 * service like this is a fire-and-forget write — the activity timestamp, a log
 * line — failing after its request has already been answered. Killing the
 * process over that would take the service down for something no reader
 * noticed.
 */
process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled promise rejection');
});

/**
 * An uncaught exception leaves the process in an unknown state — the stack that
 * threw is gone, and whatever it was midway through never completed. There is
 * no safe way to continue from here, so it is logged and the process exits;
 * whatever supervises it will start a clean one.
 */
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception; exiting');
  process.exit(1);
});

start();
