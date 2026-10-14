import { scriptProps } from '../../lib/storyText';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PageHeading from '../../components/layout/PageHeading';
import Button from '../../components/ui/Button';
import useResource from '../../hooks/useResource';
import { ResourceState, StoryList } from '../../components/stories/StoryList';
import { languages } from '../../i18n/messages';

function Composer({ story, onSaved }) {
  const { t, locale } = useLanguage();
  const { user, authorizedRequest } = useAuth();
  const storageKey = `baithak.draft.${user.id}.${story?._id || 'new'}`;
  const initial = story?.texts?.find(text => text.isOriginal) || story?.texts?.[0];
  const [form, setForm] = useState(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(storageKey)); if (saved?.title !== undefined && saved?.body !== undefined && languages.some(l => l.id === saved.language)) return { title: saved.title, body: saved.body, language: saved.language, id: saved.id }; } catch { /* Storage is optional. */ }
    return { title: initial?.title || '', body: initial?.body || '', language: initial ? initial.script === 'shahmukhi' ? 'pa' : initial.language === 'pa' ? 'roman' : 'en' : locale, id: story?._id || null };
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [storageOk, setStorageOk] = useState(true);
  const locked = useRef(false);
  const [dirty, setDirty] = useState(false);
  const writingLanguage = languages.find(l => l.id === form.language) || languages[0];
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function update(field, value) {
    const next = { ...form, [field]: value };
    setForm(next); setDirty(true); setSuccess(''); setError('');
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); setStorageOk(true); } catch { setStorageOk(false); }
  }
  async function save(event) {
    event.preventDefault();
    if (locked.current) return;
    const status = event.nativeEvent.submitter?.value || 'draft';
    if (!form.title.trim() || !form.body.trim()) { setError('storyRequired'); return; }
    locked.current = true; setBusy(true); setError(''); setSuccess('');
    let id = form.id;
    try {
      const original = { ...writingLanguage.content, title: form.title.trim(), body: form.body.trim(), isOriginal: true, source: 'author' };
      const texts = story?.texts?.length > 1 ? story.texts.map(text => text === initial ? original : text) : [original];
      // Create privately first. Once its ID is known, publishing retries target the same story.
      const saved = await authorizedRequest(id ? `/stories/${id}` : '/stories', { method: id ? 'PATCH' : 'POST', body: { texts, ...(!id ? { status: 'draft' } : {}) } });
      id = saved._id || saved.id;
      setForm(current => ({ ...current, id }));
      try { sessionStorage.setItem(storageKey, JSON.stringify({ ...form, id })); } catch { setStorageOk(false); }
      if (status === 'published' && story?.status !== 'published') await authorizedRequest(`/stories/${id}`, { method: 'PATCH', body: { status: 'published' } });
      setDirty(false);
      onSaved?.();
      setSuccess(status === 'published' || story?.status === 'published' ? 'storyPublished' : 'draftSaved');
      try { sessionStorage.removeItem(storageKey); } catch { /* The server has saved the story. */ }
    } catch (failure) { setError(failure.status === 422 ? 'checkStory' : 'storySaveFailed'); }
    finally { setBusy(false); locked.current = false; }
  }
  if (success === 'storyPublished') return <div className="content-empty" role="status"><h2>{t('storyPublished')}</h2><p>{t('storyThanks')}</p><Link className="button primary" to={`/app/stories/${form.id}`}>{t('readStory')}</Link><Link className="text-link" to="/app/feed">{t('backFeed')}</Link></div>;
  return <><p className="content-intro">{t('createHint')}</p><form className="story-form" onSubmit={save}>
    <fieldset disabled={busy}>
      <label htmlFor="story-language">{t('storyLanguage')}</label><select id="story-language" value={form.language} disabled={story?.texts?.length > 1} onChange={e => update('language', e.target.value)}>{languages.map(item => <option key={item.id} value={item.id}>{item.id === 'roman' ? 'Roman Punjabi' : item.label}</option>)}</select>
      <label htmlFor="story-title">{t('storyTitle')}</label><input id="story-title" required maxLength={200} value={form.title} {...scriptProps(writingLanguage.content)} onChange={e => update('title', e.target.value)} />
      <label htmlFor="story-body">{t('storyText')}</label><textarea id="story-body" required maxLength={50000} rows={12} value={form.body} {...scriptProps(writingLanguage.content)} onChange={e => update('body', e.target.value)} aria-describedby="writing-hint" /><p id="writing-hint" className="content-note">{t('writingHint')}</p>
    </fieldset>
    <p className="publish-note">{t('publicNote')}</p>
    {error && <p role="alert" className="content-error">{t(error)}</p>}
    <div role="status" className="save-status">{success && t(success)}{dirty && t(storageOk ? 'draftInTab' : 'draftNotLocal')}</div>
    <div className="composer-actions"><Button type="submit" value="published" className="primary" busy={busy}>{t(busy ? 'savingStory' : story?.status === 'published' ? 'saveChanges' : 'publishStory')}</Button>{story?.status !== 'published' && <Button type="submit" value="draft" disabled={busy}>{t('saveDraft')}</Button>}</div>
  </form></>;
}
function EditStory({ id }) {
  const resource = useResource(`/stories/${id}`);
  const { user } = useAuth();
  const { t } = useLanguage();
  if (resource.data && resource.data.author?._id !== user.id) return <p className="content-status">{t('onlyOwnStory')}</p>;
  return <><ResourceState resource={resource} />{resource.data && <Composer story={resource.data} />}</>;
}
function MyWriting({ revision }) {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();
  return <details className="my-writing" onToggle={e => setOpen(e.currentTarget.open)}><summary>{t('myWriting')}</summary>{open && <StoryList key={revision} path="/stories/mine?limit=12" empty="noOwnStories" />}</details>;
}
export default function CreatePage() {
  const [revision, setRevision] = useState(0);
  const { id } = useParams();
  const { t } = useLanguage();
  return <section className="workspace-page"><PageHeading title={t(id ? 'editStory' : 'create')} />{id ? <EditStory key={id} id={id} /> : <><Composer onSaved={() => setRevision(value => value + 1)} /><MyWriting revision={revision} /></>}</section>;
}
