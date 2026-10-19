/**
 * Configuration for unit tests.
 *
 * `config/env.js` validates the environment and throws when `MONGODB_URI` or
 * `JWT_SECRET` is missing — deliberately, because a process booting without them
 * is a bug that should be loud and immediate. Unit tests open no database and
 * sign nothing, but they import modules that reach the config on their way in
 * (`utils/pagination.js` reads its default page size from it), so validation has
 * to be satisfied before the module under test is evaluated.
 *
 * A `.env` would satisfy it, and there is one on the machine this was written
 * on — but `.env` is not in version control, so a suite that only passes where
 * someone once created one is not a suite. The values are supplied here instead.
 *
 * They also *shadow* `.env` rather than merely filling a gap. `dotenv` does not
 * overwrite variables that are already present, so setting these first means
 * `config/env.js` will read the placeholder URI even when a real one is
 * configured. That is the point: a unit test must never be one stray `connect()`
 * away from the development database.
 *
 * Import this **first**, above anything that reaches `config/env.js`. ESM
 * evaluates imports depth-first in declaration order, so the first import in a
 * test file has finished running before the second one starts; after that,
 * assigning to `process.env` is too late.
 *
 * `NODE_ENV=test` is what keeps this contained. It only lowers the log level
 * here, and a deployed process sets `production` — but more importantly this
 * module is imported exclusively by test files, so none of it is reachable from
 * `server.js`.
 */

process.env.NODE_ENV ??= 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/baithak-unit-test';
process.env.JWT_SECRET ??= 'placeholder-for-unit-tests-not-used-to-sign-anything';
