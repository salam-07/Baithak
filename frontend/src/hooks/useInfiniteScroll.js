import { useEffect, useRef } from 'react';

// Reconnect after each page to fill short viewports, using the deck's own scroller.
export default function useInfiniteScroll(resource, { root, rootMargin = '600px 0px', paused = false } = {}) {
  const sentinel = useRef(null);
  const { busy, error, more, meta } = resource;
  const cursor = meta?.pagination?.nextCursor;
  const enabled = meta?.pagination?.hasMore && cursor && !busy && !error && !paused;
  useEffect(() => {
    if (!enabled || !sentinel.current) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) more();
    }, { root: root?.current ?? null, rootMargin });
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [enabled, cursor, more, root, rootMargin]);
  return sentinel;
}
