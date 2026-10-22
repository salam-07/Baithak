import { textFor, scriptProps } from '../../lib/storyText';
import CuratedBadge from './CuratedBadge';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { errorMessage } from '../../lib/api';
import LoadingState from '../ui/LoadingState';
import Button from '../ui/Button';
import useResource from '../../hooks/useResource';
import useInfiniteScroll from '../../hooks/useInfiniteScroll';

export function ResourceState({ resource }) {
  const { t } = useLanguage();
  if (resource.error) return <div className="content-status" role="alert"><p>{t(resource.error.status === 404 ? 'contentMissing' : errorMessage(resource.error))}</p><Button onClick={resource.operation === 'more' ? resource.more : resource.retry}>{t('retry')}</Button></div>;
  if (resource.busy) return <LoadingState label={resource.loadingLabel} kind={resource.loadingKind} compact={resource.data !== null} />;
  return null;
}
export function Pagination({ resource, automatic = false }) {
  const { t } = useLanguage();
  const sentinel = useInfiniteScroll(resource, { paused: !automatic });
  return <div className="list-footer" ref={sentinel}><ResourceState resource={resource} />{!resource.busy && !resource.error && (resource.meta?.pagination?.hasMore ? !automatic && <Button onClick={resource.more}>{t('loadMore')}</Button> : resource.data?.length > 0 && <p>{t('allRead')}</p>)}</div>;
}
export function StoryCard({ story }) {
  const { t, contentPreference } = useLanguage();
  const text = textFor(story, contentPreference);
  return <article className="story-card">
    <div className="story-meta"><CuratedBadge story={story} />{story.status === 'draft' ? <span>{t('draft')}</span> : story.publishedAt && <time dateTime={story.publishedAt}>{new Date(story.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>}</div>
    <Link className="story-open" to={story.status === 'draft' ? `/app/write/${story.id}` : `/app/stories/${story.id}`} {...scriptProps(text)}><h2>{text?.title}</h2><p>{text?.excerpt}</p></Link>
    <Link className="text-link" to={story.status === 'draft' ? `/app/write/${story.id}` : `/app/stories/${story.id}`}>{t(story.status === 'draft' ? 'continueDraft' : 'readStory')}</Link>
  </article>;
}
export function StoryList({ path, empty = 'noStories', automatic = false }) {
  const resource = useResource(path, true);
  const { t } = useLanguage();
  return <><div>{resource.data?.map(story => <StoryCard key={story.id} story={story} />)}</div>
    {!resource.busy && !resource.error && resource.data?.length === 0 && <div className="content-empty"><h2>{t(empty)}</h2><p>{t('tryAnotherPath')}</p><Link className="text-link" to={empty === 'noSearchResults' ? '/app/keywords' : '/app/write'}>{t(empty === 'noSearchResults' ? 'browseKeywords' : 'write')}</Link></div>}
    <Pagination resource={resource} automatic={automatic} /></>;
}
