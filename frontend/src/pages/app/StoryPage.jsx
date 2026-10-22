import { textFor, scriptProps } from '../../lib/storyText';
import CuratedBadge from '../../components/stories/CuratedBadge';
import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import PageHeading from '../../components/layout/PageHeading';
import Button from '../../components/ui/Button';
import useResource from '../../hooks/useResource';
import { ResourceState } from '../../components/stories/StoryList';
import { errorMessage } from '../../lib/api';

import StoryKeywords from '../../components/stories/StoryKeywords';
import KeywordText from '../../components/stories/KeywordText';
import { annotationsFor } from '../../lib/keywordAnnotations';

function Reading({ story }) {
  const { t, locale, contentPreference } = useLanguage();
  const { user, authorizedRequest } = useAuth();
  const location = useLocation();
  const [chosen, setChosen] = useState(null);
  const [liked, setLiked] = useState(Boolean(story.viewerHasLiked));
  const [count, setCount] = useState(story.likeCount || 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const text = story.texts.find(item => `${item.language}-${item.script}` === chosen) || textFor(story, contentPreference);
  const preferredAvailable = story.texts.some(item => item.language === contentPreference.language && item.script === contentPreference.script);
  async function appreciate() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      const result = await authorizedRequest(`/stories/${story._id}/like`, { method: liked ? 'DELETE' : 'POST' });
      setLiked(result.liked);
      setCount(result.likeCount ?? Math.max(0, count + (result.liked ? 1 : -1)));
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  const owner = user?.id === story.author?._id;
  return <><PageHeading title={text.title} titleContent={<KeywordText text={text.title} spans={annotationsFor(story, text).title} story={story} />} textProps={scriptProps(text)} />
    <div className="reader-byline"><CuratedBadge story={story} /><span dir="auto">{story.author?.name || story.author?.username}</span>{story.publishedAt && <time dateTime={story.publishedAt}>{new Date(story.publishedAt).toLocaleDateString()}</time>}{story.status === 'draft' && <span>{t('draft')}</span>}</div>
    {story.texts.length > 1 && <div className="reader-versions">{story.texts.map(item => <button key={`${item.language}-${item.script}`} aria-pressed={text === item} onClick={() => setChosen(`${item.language}-${item.script}`)}>{item.script === 'shahmukhi' ? 'پنجابی' : item.language === 'pa' ? 'Roman Punjabi' : 'English'}</button>)}</div>}
    {!preferredAvailable && <p className="content-note">{t('originalAvailable')}</p>}
    {!text.isOriginal && <p className="content-note">{t(text.source === 'community' ? 'communityTranslation' : 'authorTranslation')}</p>}
    <div className="story-body" {...scriptProps(text)}><KeywordText text={text.body} spans={annotationsFor(story, text).body} story={story} /></div>
    <StoryKeywords story={story} />
    {story.keywords?.length > 0 && <section className="word-relations"><h2>{t('wordsInStory')}</h2><div className="story-keywords">{story.keywords.filter(word => word.key).map(word => <Link key={word._id} dir="auto" to={`/app/words/${word.key}`}>{word.labels?.[locale] || word.labels?.en || word.key}</Link>)}</div></section>}
    <footer className="reader-actions">{story.status === 'published' && (user ? <Button busy={busy} aria-pressed={liked} onClick={appreciate}>{t(liked ? 'likedStory' : 'likeStory')} · {count}</Button> : <Link className="text-link" to="/login" state={{ from: location.pathname }}>{t('signInToLike')}</Link>)}{owner && <Link className="text-link" to={`/app/write/${story._id}`}>{t('editStory')}</Link>}</footer>
    {error && <p role="alert" className="content-status">{t(error)}</p>}
  </>;
}
function StoryDetail({ id }) {
  const resource = useResource(`/stories/${id}`);
  return <><ResourceState resource={resource} />{resource.data && <Reading story={resource.data} />}</>;
}
export default function StoryPage() {
  const { id } = useParams();
  const { t } = useLanguage();
  return <section className="workspace-page"><Link className="text-link" to="/app/feed">{t('backFeed')}</Link><StoryDetail key={id} id={id} /></section>;
}
