import { useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n/messages';
import { keywordSlug } from '../../lib/keywordPresentation';
import Button from '../ui/Button';
import '../../styles/keywords.css';

export default function KeywordEditor({ word, onSaved, standalone = false }) {
  const { user, authorizedRequest } = useAuth();
  const { locale, t } = useLanguage();
  const formId = useId();
  const [language, setLanguage] = useState(locale);
  const [form, setForm] = useState(() => ({
    key: word?.key ?? '', labels: Object.fromEntries(languages.map(({ id }) => [id, word?.labels?.[id] ?? ''])),
    notes: Object.fromEntries(languages.map(({ id }) => [id, word?.notes?.[id] ?? ''])),
    aliases: word?.aliases?.join(', ') ?? '', type: word?.type ?? 'word',
    sources: word?.sources?.length ? word.sources.map(source => ({ label: source.label, url: source.url || '' })) : [{ label: '', url: '' }],
  }));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saved, setSaved] = useState(null);
  const revision = useRef(word?.revision);
  const locked = useRef(false);
  const customKey = useRef(Boolean(word));
  const script = languages.find(item => item.id === language);
  function update(key, value) { setForm(current => ({ ...current, [key]: value })); setMessage(''); }
  function updateText(group, value) {
    setForm(current => {
      const next = { ...current, [group]: { ...current[group], [language]: value } };
      if (group === 'labels' && !customKey.current && !saved) next.key = keywordSlug(next.labels.en || next.labels.roman || '');
      return next;
    });
    setMessage('');
  }
  function updateSource(index, field, value) {
    update('sources', form.sources.map((source, i) => i === index ? { ...source, [field]: value } : source));
  }
  async function save(event) {
    event.preventDefault();
    if (locked.current) return;
    if (!Object.values(form.labels).some(value => value?.trim()) || !Object.values(form.notes).some(value => value?.trim())) {
      setMessage('keywordNeedsMeaning'); return;
    }
    locked.current = true; setBusy(true); setMessage('');
    try {
      const sources = form.sources.filter(source => source.label.trim() || source.url.trim())
        .map(source => ({ label: source.label.trim(), ...(source.url.trim() ? { url: source.url.trim() } : {}) }));
      const result = await authorizedRequest('/keywords', { method: 'POST', body: {
        key: form.key, ...(revision.current ? { revision: revision.current } : {}),
        labels: form.labels, notes: form.notes, type: form.type,
        aliases: form.aliases.split(/[,،]/).map(alias => alias.trim()).filter(Boolean), sources,
      } });
      revision.current = result.revision; setSaved(result); setMessage('keywordSaved'); onSaved?.(result);
    } catch (error) {
      setMessage(error.status === 409 ? revision.current ? 'keywordConflict' : 'keywordExists' : error.status === 422 ? 'keywordInvalid' : 'keywordSaveFailed');
    } finally { setBusy(false); locked.current = false; }
  }
  if (!user) return <p><Link to="/login">{t('keywordSignIn')}</Link></p>;
  const content = <>
    <p className="content-note">{t('keywordShared')}</p>
    <form onSubmit={save} onInvalidCapture={event => { const details = event.target.closest('details.keyword-extra'); if (details) details.open = true; }} aria-describedby={formId + '-requirements'}><fieldset disabled={busy}>
      <p id={formId + '-requirements'} className="content-note">{t('keywordNeedsMeaning')}</p>
      <label htmlFor={formId + '-language'}>{t('keywordLanguage')}</label>
      <select id={formId + '-language'} value={language} onChange={event => setLanguage(event.target.value)}>
        {languages.map(item => <option key={item.id} value={item.id}>{item.id === 'roman' ? 'Roman Punjabi' : item.label}</option>)}
      </select>
      <label htmlFor={formId + '-name'}>{t(language === 'pa' ? 'keywordPunjabiName' : language === 'roman' ? 'keywordRomanName' : 'keywordName')}</label>
      <input id={formId + '-name'} maxLength={120} value={form.labels[language] || ''} onChange={event => updateText('labels', event.target.value)} lang={script.lang} dir={script.dir} />
      <label htmlFor={formId + '-meaning'}>{t('keywordExplanation')}</label>
      <textarea id={formId + '-meaning'} rows={5} maxLength={4000} value={form.notes[language] || ''} onChange={event => updateText('notes', event.target.value)} lang={script.lang} dir={script.dir} />
      <label htmlFor={formId + '-type'}>{t('keywordCategory')}</label>
      <select id={formId + '-type'} value={form.type} onChange={event => update('type', event.target.value)}>{['person', 'place', 'object', 'metaphor', 'word', 'tradition', 'theme'].map(type => <option key={type} value={type}>{t('keywordType_' + type)}</option>)}</select>
      {!word && !saved && <div className="keyword-address">
        <label htmlFor={formId + '-key'}>{t('keywordKey')}</label>
        <input id={formId + '-key'} required pattern="[a-z0-9](?:[a-z0-9]|-){1,58}" minLength={2} maxLength={59} value={form.key} dir="ltr" onChange={event => { customKey.current = true; update('key', event.target.value); }} aria-describedby={formId + '-key-hint'} />
        <p id={formId + '-key-hint'} className="content-note">{t('keywordKeyHint')}</p>
      </div>}
      <details className="keyword-extra"><summary>{t('keywordMore')}</summary>
        <label htmlFor={formId + '-aliases'}>{t('keywordAliases')}</label>
        <input id={formId + '-aliases'} maxLength={4800} value={form.aliases} onChange={event => update('aliases', event.target.value)} dir="auto" />
        <h3>{t('keywordSources')}</h3>
        {form.sources.map((source, index) => <div className="keyword-source-fields" key={index}>
          <label htmlFor={formId + '-source-' + index}>{t('keywordSourceName')}</label>
          <input id={formId + '-source-' + index} maxLength={200} required={Boolean(source.url.trim())} value={source.label} onChange={event => updateSource(index, 'label', event.target.value)} dir="auto" />
          <label htmlFor={formId + '-url-' + index}>{t('keywordSourceUrl')}</label>
          <input id={formId + '-url-' + index} type="url" pattern="https?://.+" maxLength={500} value={source.url} onChange={event => updateSource(index, 'url', event.target.value)} dir="ltr" placeholder="https://" />
          <button type="button" className="text-link" onClick={() => update('sources', form.sources.filter((_, i) => i !== index))}>{t('keywordRemoveSource')}</button>
        </div>)}
        {form.sources.length < 20 && <button type="button" className="text-link" onClick={() => update('sources', [...form.sources, { label: '', url: '' }])}>{t('keywordAddSource')}</button>}
      </details>
      {message && <p className="keyword-feedback" role={message === 'keywordSaved' ? 'status' : 'alert'}>{t(message)}{message === 'keywordExists' && <> <Link to={'/app/words/' + encodeURIComponent(form.key)}>{t('keywordLearn')}</Link></>}</p>}
      <Button type="submit" busy={busy} busyLabel={t('savingChanges')}>{t(word || saved ? 'saveChanges' : 'keywordCreate')}</Button>
      {saved && !word && <Link className="keyword-link" to={'/app/words/' + saved.key}>{t('keywordLearn')}</Link>}
    </fieldset></form>
  </>;
  return standalone ? <div className="keyword-editor">{content}</div> : <details className="keyword-editor"><summary>{t(word ? 'keywordEdit' : 'keywordAdd')}</summary>{content}</details>;
}
