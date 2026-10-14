/**
 * The shuffled feed's ordering, decided here rather than in the database.
 *
 * The feed paginates, so the order has to be reproducible: the deck's **Load
 * more** asks for the page after the one it holds, and a fresh permutation each
 * time would repeat stories the reader has already passed and drop others. That
 * is what the seed is for — same seed, same order, whichever page is asked for —
 * and the client draws a new one on every load, so a reload is a new deal.
 *
 * The reason this is a Fisher–Yates shuffle in the application and not a sort on
 * a computed field in an aggregation is that MongoDB cannot express the function.
 * Reordering a set means mixing each document's bits, and the expression language
 * has no bitwise operators (the `$bit*` group arrived in 6.3 and only operates on
 * integers, which an `ObjectId` is not). What it *can* express is arithmetic on a
 * number, and the arithmetic that looks like it would do the job does not:
 *
 *   - Adding the seed to a per-document value, `mod(salt + seed, 1)`, reads as a
 *     rotation and is one. Rotating a set of points on a circle cannot change
 *     their cyclic order, so every seed produces one of N orderings — each a
 *     rotation of the others, differing only in where the list starts. With the
 *     seeds a request actually draws, consecutive seeds produce byte-identical
 *     orders. `pagination.test.js` used to assert this scheme worked; it did not.
 *   - Multiplying instead, `mod(salt * k, 1)`, is a real permutation generator,
 *     but the quality depends on `k`, and for `k` below the number of documents
 *     it leaves runs of ordered cards a reader can see.
 *
 * A shuffle in JavaScript has neither problem: `Math.imul` gives real 32-bit
 * multiplication, and a small PRNG built on it produces a uniform permutation for
 * any seed. The cost is that the candidate ids have to be read out of the
 * database to be shuffled, which is why the pool is bounded — see
 * `FEED_CANDIDATE_LIMIT`. Ids are the cheapest thing a document has, and the sort
 * this replaces was an in-memory sort of the same bounded set, so the trade is a
 * small projection instead of a sort.
 *
 * Nothing here is random in the sense of being unpredictable. The order is a pure
 * function of `(the ids, the seed)`, which is the property that makes it
 * resumable, and it is the seed that a reader chooses by reloading.
 */

/** Mixes a small client-supplied seed so consecutive seeds are unrelated. */
function mixSeed(seed) {
  let state = (Number(seed) | 0) + 0x9e3779b9;

  state = Math.imul(state ^ (state >>> 16), 0x21f0aaad);
  state = Math.imul(state ^ (state >>> 15), 0x735a2d97);

  return (state ^ (state >>> 15)) >>> 0;
}

/**
 * A deterministic PRNG in four lines: mulberry32.
 *
 * Chosen because it is a handful of integer operations with no state to carry and
 * a uniform output over `[0, 1)`, which is all a Fisher–Yates pass needs. The
 * operations are exact — `Math.imul` is 32-bit integer multiplication, and `>>> 0`
 * holds the state unsigned — so the sequence is identical on every machine and in
 * every Node version, which is what lets a cursor resume on a later request.
 */
function randomSequence(seed) {
  let state = mixSeed(seed);

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;

    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/**
 * The same ids, in a seeded order.
 *
 * Fisher–Yates from the end: every position is swapped with a uniformly chosen
 * one from the unshuffled part, which is the definition of a uniform random
 * permutation rather than an approximation of one. The input is not modified —
 * callers hold the pool and would otherwise find it reordered underneath them.
 */
export function shuffleIds(ids, seed) {
  const next = randomSequence(seed);
  const shuffled = [...ids];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapWith = Math.floor(next() * (index + 1));
    [shuffled[index], shuffled[swapWith]] = [shuffled[swapWith], shuffled[index]];
  }

  return shuffled;
}

export default shuffleIds;
