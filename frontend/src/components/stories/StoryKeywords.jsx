import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import Button from '../ui/Button';

export default function StoryKeywords({ story }) {
  const { user, authorizedRequest } = useAuth();
  const { t, locale } = useLanguage();
  const [words, setWords] = useState(() => [...new Map([...(story.detectedKeywords ?? []), ...(story.keywords ?? [])].map(word => [String(word._id), word])).values()]);
  const [settings, setSettings] = useState(() => ({ custom: story.keywordSettings?.custom ?? [], excluded: story.keywordSettings?.excluded ?? [], notes: story.keywordSettings?.notes ?? [] }));
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const revision = useRef(story.keywordRevision ?? 1);
  const lock = useRef(false);
  async function search(event) {
    event.preventDefault(); setSearching(true); setMessage('');
    try { setResults(await authorizedRequest('/keywords?limit=20&search=' + encodeURIComponent(query.trim()))); }
    catch { setMessage('keywordSearchFailed'); }
    finally { setSearching(false); }
  }
  function toggle(id, enabled) {
    setSettings(current => ({ ...current, excluded: enabled ? current.excluded.filter(value => value !== id) : [...new Set([...current.excluded, id])] }));
  }
  function note(id, explanation) {
    setSettings(current => ({ ...current, notes: [...current.notes.filter(value => value.keyword !== id), ...(explanation ? [{ keyword: id, explanation }] : [])] }));
  }
  async function save() {
    if (lock.current) return;
    lock.current = true; setBusy(true); setMessage('');
    try {
      const result = await authorizedRequest('/stories/' + story._id + '/keywords', { method: 'PUT', body: { revision: revision.current, settings } });
      revision.current = result.revision; setMessage('keywordStorySaved');
    } catch (error) { setMessage(error.status === 409 ? 'keywordConflict' : 'keywordSaveFailed'); }
    finally { setBusy(false); lock.current = false; }
  }
  if (!user) return <p><Link to="/login">{t('keywordSignIn')}</Link></p>;
  return <details className="keyword-editor"><summary>{t('keywordStoryEdit')}</summary>
    <p className="content-note">{t('keywordStoryHint')}</p>
    <fieldset disabled={busy}>
      {words.map(word => {
        const id = String(word._id);
        return <div className="keyword-assignment" key={id}>
          <label><input type="checkbox" checked={!settings.excluded.includes(id)} onChange={event => toggle(id, event.target.checked)} /><span dir="auto">{word.labels?.[locale] || word.labels?.en || word.key}</span></label>
          <details><summary>{t('keywordContextOverride')}</summary><label>{t('keywordExplanation')}<textarea rows={3} maxLength={4000} dir="auto" value={settings.notes.find(value => value.keyword === id)?.explanation ?? ''} onChange={event => note(id, event.target.value)} /></label><p className="content-note">{t('keywordOverrideHint')}</p></details>
        </div>;
      })}
      <form onSubmit={search}><label>{t('keywordCustom')}<input value={query} maxLength={200} onChange={event => setQuery(event.target.value)} /></label><Button type="submit" busy={searching} busyLabel={t('searchingContent')}>{t('search')}</Button></form>
      {results.length > 0 && <div className="story-keywords">{results.map(word => <button type="button" key={word.id} disabled={words.some(value => String(value._id) === word.id)} onClick={() => {
        setWords(current => [...current, { ...word, _id: word.id }]);
        setSettings(current => ({ ...current, custom: [...new Set([...current.custom, word.id])], excluded: current.excluded.filter(id => id !== word.id) }));
      }}>{word.labels?.[locale] || word.labels?.en || word.key}</button>)}</div>}
      <Button onClick={save} busy={busy} busyLabel={t('savingChanges')}>{t('saveChanges')}</Button>
    </fieldset>
    {message && <p role={message === 'keywordStorySaved' ? 'status' : 'alert'}>{t(message)}</p>}
  </details>;
}
