
export default function createTtlCache({ ttlMs, loader, name = 'cache' }) {
  let value;
  let expiresAt = 0;
  let inflight = null;
  let generation = 0;

  const isFresh = () => expiresAt > Date.now() && value !== undefined;

  async function load(version) {
    const loaded = await loader();
    // An edit may invalidate the snapshot while its query is still running.
    if (version === generation) {
      value = loaded;
      expiresAt = Date.now() + ttlMs;
    }
    return loaded;
  }

  return {
    async get() {
      if (isFresh()) return value;

      if (!inflight) {
        const version = generation;
        inflight = load(version).finally(() => {
          // Cleared in `finally` so a rejected loader does not leave the cache
          // permanently wedged on a rejected promise — the next caller retries
          // rather than inheriting the failure forever.
          if (version === generation) inflight = null;
        });
      }

      return inflight;
    },

    /**
     * Drops the cached value. The next read reloads.
     *
     * Not a write-through: the caller has just changed the underlying data, and
     * making this method re-run the loader would put the cost of the write on
     * the writer's request. Letting the next reader pay it is both simpler and
     * better, since reads outnumber writes here by a wide margin.
     */
    invalidate() {
      generation += 1;
      value = undefined;
      expiresAt = 0;
      inflight = null;
    },

    /** For diagnostics and tests. */
    get status() {
      return { name, ttlMs, hasValue: value !== undefined, expiresAt, loading: Boolean(inflight) };
    },
  };
}
