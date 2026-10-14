import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.js';

/**
 * Connection options worth explaining.
 *
 * `serverSelectionTimeoutMS` is left short-ish so that a wrong host or an IP
 * not yet allowlisted in Atlas fails the boot in seconds with a clear message,
 * rather than hanging for the 30s driver default while the process looks alive.
 *
 * `maxPoolSize` is per process. The driver's default of 100 is generous for an
 * API whose queries are all index-backed and sub-millisecond; 20 is still far
 * more concurrency than the work needs, and a lower number is what keeps a
 * scaled-out deployment from opening thousands of sockets to a cluster that
 * charges by connection count.
 *
 * Atlas and most managed providers sit behind a TLS proxy, where a socket that
 * has gone quiet for a while is dropped without the client noticing. Without a
 * retry the first request after an idle period fails; this is the driver's own
 * recommended handling for that. `retryWrites` is a driver option, not a
 * mongoose one, so it belongs here rather than in a `mongoose.set()` call.
 */
const CONNECT_OPTIONS = Object.freeze({
  serverSelectionTimeoutMS: 10_000,
  maxPoolSize: 20,
  minPoolSize: 2,
  socketTimeoutMS: 45_000,
  retryWrites: true,
  // Off by default in production: mongoose would otherwise run createIndex for
  // every model on every boot, which is a write against a live collection and
  // can block the replicas that serve reads. Indexes are built deliberately
  // via `npm run indexes` instead.
  autoIndex: !env.isProduction,
});

mongoose.set('strictQuery', true);
// Mongoose would otherwise use the driver's deprecated `count` path for
// estimatedDocumentCount-like work. `countDocuments` is what the services use,
// but this makes any accidental use of the old behaviour fail loudly in dev.
mongoose.set('bufferCommands', false);

export async function connectDatabase(uri = env.mongoUri) {
  mongoose.connection.on('connected', () => logger.info('MongoDB connected'));
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));

  // A replica-set election or a network partition surfaces here. Mongoose
  // retries by itself, so this is a warning rather than a fatal — crashing the
  // process on a transient blip would drop every in-flight request too.
  mongoose.connection.on('error', (error) => logger.error({ err: error }, 'MongoDB error'));

  await mongoose.connect(uri, CONNECT_OPTIONS);

  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.connection.close(false);
}

/**
 * Resolves once the connection can serve reads. Used by the health endpoint so
 * that a readiness probe distinguishes "process is up" from "process can
 * actually answer queries".
 */
export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}

export default mongoose;
