
export default function createTtlCache({ ttlMs, loader, name = 'cache' }) {
  let value;
  let expiresAt = 0;
  let inflight = null;

  const isFresh = () => expiresAt > Date.now() && value !== undefined;

  async function load() {
    // The loader runs outside the freshness check by design: whatever it
    // returns becomes the new value even if the entry was refreshed while it
    // was running, but a single caller still only ever triggers one run.
    const loaded = await loader();
    value = loaded;
    expiresAt = Date.now() + ttlMs;
    return value;
  }

  return {
    async get() {
      if (isFresh()) return value;

      if (!inflight) {
        inflight = load().finally(() => {
          // Cleared in `finally` so a rejected loader does not leave the cache
          // permanently wedged on a rejected promise — the next caller retries
          // rather than inheriting the failure forever.
          inflight = null;
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
