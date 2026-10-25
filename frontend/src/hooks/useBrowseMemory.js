import { useLayoutEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Keep data references, not mounted pages or serialized copies. Reload starts fresh.
const visits = new Map();
const MAX_VISITS = 12;

export function useBrowseMemory() {
  const { pathname, search } = useLocation();
  const { user, status } = useAuth();
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const eligible = /^(?:\/|\/app(?:\/(?:feed|curated|keywords|explore|search|words\/[^/]+|stories\/[^/]+))?)$/.test(pathname);
  if (!eligible) return null;
  const key = `${user?.id || user?._id || status}:${pathname}${search}`;
  let visit = visits.get(key);
  if (!visit) {
    visit = { seed, resources: new Map(), top: 0, deck: 0 };
    visits.set(key, visit);
    if (visits.size > MAX_VISITS) visits.delete(visits.keys().next().value);
  } else {
    visits.delete(key);
    visits.set(key, visit);
  }
  return visit;
}

export function useBrowseScroll(container, ready = true) {
  const visit = useBrowseMemory();
  const { pathname, search } = useLocation();
  useLayoutEffect(() => {
    if (!ready) return;
    const node = container?.current;
    if (container && !node) return;
    if (node) node.scrollTo({ top: visit?.deck || 0, behavior: 'instant' });
    else window.scrollTo({ top: visit?.top || 0, behavior: 'instant' });
    const target = node || window;
    // A single number assignment; no React updates, timers, or layout reads.
    // Saving on scroll avoids the browser clamping the old page during unmount.
    const save = () => {
      if (visit) visit[node ? 'deck' : 'top'] = node ? node.scrollTop : window.scrollY;
    };
    target.addEventListener('scroll', save, { passive: true });
    return () => {
      target.removeEventListener('scroll', save);
    };
  }, [visit, container, ready, pathname, search]);
}
