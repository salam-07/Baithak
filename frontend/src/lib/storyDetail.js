import { useEffect, useRef, useState } from 'react';

import { useAuth } from '../context/AuthContext';

/**
 * The full story behind a feed card.
 *
 * A card carries an excerpt and never a body — the listing deliberately truncates
 * every text variant in the database, because shipping whole stories to render
 * three lines of each is the largest avoidable cost in the read path (see the
 * backend's `services/story-card.js`). Opening a card therefore costs a second
 * request, and this is what keeps that request from being felt: it is made on the
 * press and on focus, so it is usually already in flight, or already in here, by
 * the time the card has finished growing open.
 *
 * The cache is keyed by id and bounded, oldest first. It is not authoritative for
 * anything a reader can change: the rail reads its counts from the deck's own
 * reaction state, so an appreciation given in the opened card is never re-read
 * from a document fetched before it happened.
 */
const MAX_CACHED = 40;
const stories = new Map();
const pending = new Map();

function remember(id, story) {
  stories.set(id, { story, at: Date.now() });
  if (stories.size > MAX_CACHED) stories.delete(stories.keys().next().value);
}

/** The story if it is already here, otherwise nothing. Never triggers a request. */
export function readStory(id) {
  const entry = stories.get(id);
  return entry && Date.now() - entry.at < 30000 ? entry.story : null;
}

/**
 * The story, fetching it only if neither the cache nor an in-flight request has it.
 *
 * A hover prefetch and the press that follows share one request rather than racing
 * each other. Failures are not remembered, so a retry is a real retry.
 */
export function loadStory(id, request) {
  const cached = readStory(id);
  if (cached) return Promise.resolve(cached);

  const inFlight = pending.get(id);
  if (inFlight) return inFlight;

  const promise = request(`/stories/${id}`).then(
    (story) => { pending.delete(id); remember(id, story); return story; },
    (error) => { pending.delete(id); throw error; },
  );
  pending.set(id, promise);
  return promise;
}

/** Warms the cache. Nothing is waiting on the answer, so nothing is done with a refusal. */
export function prefetchStory(id, request) {
  loadStory(id, request).catch(() => {});
}

/**
 * The story for one card, resolving through the cache.
 *
 * `request` is read through a ref because it is rebuilt whenever the session
 * changes, and depending on it would restart a fetch that has not changed.
 */
export function useStoryDetail(id) {
  const { authorizedRequest } = useAuth();
  const send = useRef(authorizedRequest);
  useEffect(() => { send.current = authorizedRequest; });

  const [state, setState] = useState(() => ({ story: readStory(id), error: null }));

  useEffect(() => {
    let active = true;
    loadStory(id, send.current).then(
      (story) => { if (active) setState({ story, error: null }); },
      (error) => { if (active) setState((previous) => (previous.story ? previous : { story: null, error })); },
    );
    return () => { active = false; };
  }, [id]);

  return state;
}
