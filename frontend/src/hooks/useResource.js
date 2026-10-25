import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBrowseMemory } from './useBrowseMemory';

// A keyed caller resets a list when its query changes. Ignore responses after unmount.
export default function useResource(path, paginated = false) {
  const { authorizedRequest } = useAuth();
  const visit = useBrowseMemory();
  const send = useRef(authorizedRequest);
  useEffect(() => { send.current = authorizedRequest; });
  const [state, setState] = useState(() => visit?.resources.get(path) || { data: null, meta: null, busy: true, error: null, operation: 'initial' });
  const [attempt, retry] = useState(0);
  const [identity, setIdentity] = useState({ path, visit });
  if (identity.path !== path || identity.visit !== visit) {
    setIdentity({ path, visit });
    setState(visit?.resources.get(path) || { data: null, meta: null, busy: true, error: null, operation: 'initial' });
    retry(0);
  }
  const generation = useRef(0);
  const loadingMore = useRef(false);
  useEffect(() => {
    if (visit && state.data !== null && !state.busy && !state.error) visit.resources.set(path, state);
  }, [visit, path, state]);
  useEffect(() => {
    const version = ++generation.current;
    if (attempt === 0 && visit?.resources.has(path)) {
      return () => { if (generation.current === version) generation.current += 1; };
    }
    const controller = new AbortController();
    loadingMore.current = false;
    let active = true;
    send.current(path, { withMeta: paginated, signal: controller.signal }).then(result => {
      if (active) setState({ data: paginated ? result.items : result, meta: result?.meta, busy: false, error: null, operation: 'initial' });
    }).catch(error => { if (active) setState(s => ({ ...s, busy: false, error })); });
    return () => { active = false; if (generation.current === version) generation.current += 1; controller.abort(); };
  }, [path, paginated, attempt, visit]);
  const more = useCallback(async () => {
    if (loadingMore.current || state.busy || !state.meta?.pagination?.hasMore || !state.meta?.pagination?.nextCursor) return;
    const version = generation.current;
    loadingMore.current = true;
    setState(s => ({ ...s, busy: true, error: null, operation: 'more' }));
    try {
      const result = await send.current(`${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(state.meta.pagination.nextCursor)}`, { withMeta: true });
      if (generation.current === version) setState(s => {
        const seen = new Set(s.data.map(item => item.id || item.key || item.name));
        const added = result.items.filter(item => {
          const id = item.id || item.key || item.name;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
        return { data: [...s.data, ...added], meta: result.meta, busy: false, error: null, operation: 'more' };
      });
    } catch (error) { if (generation.current === version) setState(s => ({ ...s, busy: false, error })); }
    finally { if (generation.current === version) loadingMore.current = false; }
  }, [path, state.busy, state.meta]);
  const directory = /^\/keywords(?:\?|$)/.test(path);
  const word = path.startsWith('/keywords/');
  const loadingKind = directory ? 'directory' : word ? 'word' : 'story';
  const loadingLabel = state.operation === 'more' ? 'loadingMore' : state.data !== null ? 'refreshingContent' : directory ? 'loadingWords' : word ? 'loadingWord' : /^\/stories(?:\?|$|\/mine)/.test(path) ? 'loadingStories' : 'loadingStory';
  return { ...state, loadingKind, loadingLabel, more, retry: () => { setState(s => ({ ...s, busy: true, error: null, operation: 'refresh' })); retry(n => n + 1); } };
}
