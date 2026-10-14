import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// A keyed caller resets a list when its query changes. Ignore responses after unmount.
export default function useResource(path, paginated = false) {
  const { authorizedRequest } = useAuth();
  const send = useRef(authorizedRequest);
  useEffect(() => { send.current = authorizedRequest; });
  const [state, setState] = useState({ data: null, meta: null, busy: true, error: null, operation: 'initial' });
  const [attempt, retry] = useState(0);
  const alive = useRef(false);
  const loadingMore = useRef(false);
  useEffect(() => {
    alive.current = true;
    let active = true;
    send.current(path, { withMeta: paginated }).then(result => {
      if (active) setState({ data: paginated ? result.items : result, meta: result.meta, busy: false, error: null, operation: 'initial' });
    }).catch(error => { if (active) setState(s => ({ ...s, busy: false, error })); });
    return () => { active = false; alive.current = false; };
  }, [path, paginated, attempt]);
  async function more() {
    if (loadingMore.current || !state.meta?.pagination?.nextCursor) return;
    loadingMore.current = true;
    setState(s => ({ ...s, busy: true, error: null, operation: 'more' }));
    try {
      const result = await send.current(`${path}${path.includes('?') ? '&' : '?'}cursor=${encodeURIComponent(state.meta.pagination.nextCursor)}`, { withMeta: true });
      if (alive.current) setState(s => ({ data: [...s.data, ...result.items.filter(item => !s.data.some(old => (old.id || old.name) === (item.id || item.name)))], meta: result.meta, busy: false, error: null }));
    } catch (error) { if (alive.current) setState(s => ({ ...s, busy: false, error })); }
    finally { loadingMore.current = false; }
  }
  const directory = /^\/keywords(?:\?|$)/.test(path);
  const word = path.startsWith('/keywords/');
  const loadingKind = directory ? 'directory' : word ? 'word' : 'story';
  const loadingLabel = state.operation === 'more' ? 'loadingMore' : state.data !== null ? 'refreshingContent' : directory ? 'loadingWords' : word ? 'loadingWord' : /^\/stories(?:\?|$|\/mine)/.test(path) ? 'loadingStories' : 'loadingStory';
  return { ...state, loadingKind, loadingLabel, more, retry: () => { setState(s => ({ ...s, busy: true, error: null, operation: 'refresh' })); retry(n => n + 1); } };
}
