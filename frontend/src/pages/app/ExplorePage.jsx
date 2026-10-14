import { keywordText, keywordPreview } from '../../lib/keywordPresentation';
import KeywordEditor from '../../components/stories/KeywordEditor';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PageHeading from '../../components/layout/PageHeading';
import { useLanguage } from '../../context/LanguageContext';
import useResource from '../../hooks/useResource';
import { Pagination, ResourceState, StoryList } from '../../components/stories/StoryList';
import Button from '../../components/ui/Button';
import Icon from '../../components/ui/Icon';

function Directory({ path, filtered }) {
  const resource = useResource(path, true);
  const { t, locale } = useLanguage();
  return <>
    <div className="keyword-grid">{resource.data?.map(item => {
      const name = keywordText(item.labels, locale, item.key);
      const note = keywordText(item.notes, locale, t('noWordNote'));
      return <Link className="keyword-card" key={item.id || item.key} to={'/app/words/' + encodeURIComponent(item.key)}>
        <h2 lang={name.lang} dir={name.dir}>{name.text}</h2>
        <span className="keyword-card-category">{t('keywordType_' + (item.type || 'word'))}</span>
        <p className="keyword-card-definition" lang={note.lang} dir={note.dir}>{keywordPreview(note.text, 180)}</p>
        <span className="keyword-card-foot"><span>{t('keywordMeaning')}</span><Icon name="arrow" /></span>
      </Link>;
    })}</div>
    {resource.data?.length === 0 && !resource.busy && !resource.error && <div className="discovery-empty" role="status"><h2>{t('noKeywords')}</h2><p>{t('noWords')}</p>{filtered && <Link className="text-link" to="/app/keywords">{t('browseKeywords')}<Icon name="arrow" /></Link>}</div>}
    <Pagination resource={resource} />
  </>;
}
export default function ExplorePage({ searchOnly = false }) {
  const [params] = useSearchParams();
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  return <ExploreContent key={String(searchOnly) + params.toString()} searchOnly={searchOnly} seed={seed} />;
}
function ExploreContent({ searchOnly, seed }) {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const submitted = params.get('q')?.trim() || '';
  const path = '/' + (searchOnly ? 'stories' : 'keywords') + '?limit=18' + (!searchOnly ? '&seed=' + seed : '') + (submitted ? '&search=' + encodeURIComponent(submitted) : '');
  function search(event) { event.preventDefault(); setParams(query.trim() ? { q: query.trim() } : {}); }
  return <section className={'workspace-page discovery-page ' + (searchOnly ? 'search-page' : 'keywords-page')}>
    <PageHeading title={t(searchOnly ? 'search' : 'keywords')}>
      {!searchOnly && <Link className="text-link" to="/app/keywords/new">{t('keywordAdd')}<Icon name="write" /></Link>}
    </PageHeading>
    <p className="discovery-intro">{t(searchOnly ? 'searchHint' : 'keywordInvitation')}</p>
    <form className="content-search discovery-search" role="search" onSubmit={search}>
      <label htmlFor="discovery-query">{t(searchOnly ? 'findStory' : 'findWord')}</label>
      <div><div className="search-field"><Icon name="search" /><input id="discovery-query" type="search" dir="auto" value={query} maxLength={200} onChange={e => setQuery(e.target.value)} autoComplete="off" enterKeyHint="search" /></div><Button type="submit">{t('search')}</Button></div>
    </form>
    {submitted && <div className="search-context"><p>{t('resultsFor')} <q dir="auto">{submitted}</q></p><Link className="text-link" to={searchOnly ? '/app/search' : '/app/keywords'}>{t('clearSearch')}<Icon name="close" /></Link></div>}
    {searchOnly ? submitted
      ? <StoryList key={path} path={path} empty="noSearchResults" />
      : <div className="search-invitation"><Icon name="book" /><h2>{t('searchStart')}</h2><p>{t('searchBrowseHint')}</p><Link className="text-link" to="/app/keywords">{t('browseKeywords')}<Icon name="arrow" /></Link></div>
      : <><p className="directory-note">{t('keywordShuffleNote')}</p><Directory key={path} path={path} filtered={Boolean(submitted)} /></>}
  </section>;
}
function WordDetail({ wordKey }) {
  const resource = useResource(`/keywords/${encodeURIComponent(wordKey)}`);
  const { t, locale } = useLanguage();
  const word = resource.data;
  const name = keywordText(word?.labels, locale, word?.key);
  const note = keywordText(word?.notes, locale, t('noWordNote'));
  const hasConnections = Boolean(word?.related?.length || word?.alsoAppearsWith?.length);
  const relations = (items, title) => items?.length > 0 && <div className="word-relation-group"><h3>{t(title)}</h3><div className="word-related-links">{items.map(item => {
    const label = keywordText(item.labels, locale, item.key);
    return <Link key={item.id} lang={label.lang} dir={label.dir} to={`/app/words/${item.key}`}>{label.text}</Link>;
  })}</div></div>;
  return <><ResourceState resource={resource} />{word && <article className="word-entry">
    <div className="word-entry-hero">
      <PageHeading title={name.text} textProps={{ lang: name.lang, dir: name.dir }} />
      <p className="word-type">{t('keywordType_' + word.type)}</p>
      <nav className="word-section-nav" aria-label={t('keywordOnPage')}>
        <a href="#word-meaning">{t('keywordMeaning')}</a>
        {hasConnections && <a href="#word-connections">{t('keywordConnections')}</a>}
        <a href="#word-sources">{t('sources')}</a>
        <a href="#word-stories">{t('storiesWithWord')}</a>
      </nav>
    </div>
    <section className="word-entry-section" id="word-meaning" aria-labelledby="word-meaning-title">
      <h2 id="word-meaning-title">{t('keywordMeaning')}</h2>
      <div className="word-section-body">
        {note.language && note.language !== locale && <p className="content-note word-language-note">{t('keywordFallback_' + note.language)}</p>}
        <div className="word-notes" lang={note.lang} dir={note.dir}>{note.text}</div>
        {word.aliases?.length > 0 && <div className="word-aliases"><h3>{t('keywordOtherNames')}</h3><p dir="auto">{word.aliases.join(', ')}</p></div>}
        <KeywordEditor key={'editor-' + word.id} word={word} onSaved={() => resource.retry()} />
      </div>
    </section>
    {hasConnections && <section className="word-entry-section" id="word-connections" aria-labelledby="word-connections-title">
      <h2 id="word-connections-title">{t('keywordConnections')}</h2>
      <div className="word-section-body">{relations(word.related, 'relatedWords')}{relations(word.alsoAppearsWith, 'appearsTogether')}</div>
    </section>}
    <section className="word-entry-section" id="word-sources" aria-labelledby="word-sources-title">
      <h2 id="word-sources-title">{t('sources')}</h2>
      <div className="word-section-body">{word.sources?.length > 0
        ? <ul className="word-source-list">{word.sources.map((source, i) => <li key={i}>{/^https?:\/\//i.test(source.url) ? <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a> : source.label}</li>)}</ul>
        : <p className="content-note">{t('keywordNoSources')}</p>}
      </div>
    </section>
    <section className="word-entry-section word-entry-stories" id="word-stories" aria-labelledby="word-stories-title">
      <h2 id="word-stories-title">{t('storiesWithWord')}</h2>
      <div className="word-section-body"><StoryList key={'stories-' + word.id} path={`/stories?keyword=${word.id}&limit=12`} /></div>
    </section>
  </article>}</>;
}
export function WordPage() {
  const { key } = useParams();
  const { t } = useLanguage();
  return <section className="workspace-page"><Link className="text-link" to="/app/keywords">{t('backExplore')}</Link><WordDetail key={key} wordKey={key} /></section>;
}

export function WordCreatePage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return <section className="workspace-page keyword-create-page">
    <Link className="text-link" to="/app/keywords">{t('backExplore')}</Link>
    <PageHeading title={t('keywordAdd')} />
    <KeywordEditor standalone onSaved={word => navigate('/app/words/' + encodeURIComponent(word.key))} />
  </section>;
}
