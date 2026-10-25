import LoadingState from '../ui/LoadingState';
import CuratedBadge from './CuratedBadge';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import useInfiniteScroll from '../../hooks/useInfiniteScroll';
import Icon from '../ui/Icon';
import FeedRail from './FeedRail';
import KeywordText from './KeywordText';
import StoryReader from './StoryReader';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { errorMessage } from '../../lib/api';
import { annotationsFor } from '../../lib/keywordAnnotations';
import { scriptProps, textFor } from '../../lib/storyText';
import { scrollDeck } from '../../lib/deckScroll';
import { attachDeckSnap } from '../../lib/deckSnap';
import { prefetchStory } from '../../lib/storyDetail';
import useResource from '../../hooks/useResource';
import { useBrowseScroll } from '../../hooks/useBrowseMemory';
import { ResourceState } from './StoryList';
import '../../styles/stage.css';

/**
 * The feed as a deck of stories.
 *
 * One story holds the screen at a time. The reader can scroll it like any list,
 * with a gentle settle after each gesture, or move a card at a time with the arrow controls or the arrow keys,
 * which travel on the deck's own curve (lib/deckScroll.js) rather than the
 * browser's.
 *
 * Opening a story does not leave the feed. The card grows where it stands, into a
 * portal above the whole shell, behind a black scrim (StoryReader.jsx). Each story
 * keeps its route and that route still resolves; the feed simply never follows it.
 *
 * Every position in here is measured from the step itself rather than from a
 * multiple of the stage's height, because a step is at least a screen tall and can
 * be taller when its story runs long. Nothing inside a step scrolls, so the stage
 * is the only scroller the deck has to share a wheel with — see the card in
 * stage.css for why that is not negotiable.
 */

/**
 * One story, filling the step.
 *
 * Memoised because the scrolling reader changes which step is current many times
 * a session and that state lives on the step, not in here — without this every
 * scroll would re-render every card in the deck to redraw nothing.
 *
 * The whole card opens the story. The title is a
 * real button so the card has one control with a name, reachable and operable from
 * the keyboard; the "Read story" line beside it is the same invitation, drawn, and
 * would only be a second tab stop for the same act.
 *
 * The excerpt arrives already annotated, so its keywords are marked here the way they
 * are in the card that opens. Those marks are hover only — see `hoverOnly` in
 * KeywordText — because the press belongs to the card: on a phone a tap on a marked
 * word must open the story rather than a tooltip, and a mark that could be tabbed to
 * would break the one-control rule above.
 */
const StageCard = memo(function StageCard({ story, index, failure, onOpen, onPrefetch }) {
  const { t, contentPreference } = useLanguage();
  const text = textFor(story, contentPreference);
  const excerpt = text?.excerpt ?? story.excerpt ?? '';
  const draft = story.status === 'draft';
  return (
    <article
      className="feed-card"
      data-open=""
      onPointerDown={() => onPrefetch(story.id)}
      onFocus={() => onPrefetch(story.id)}
      onClick={(event) => {
        if (event.target.closest('a')) return;
        onOpen(story, index, event.currentTarget);
      }}
    >
      <div className="feed-card-body">
        <div className="feed-card-head">
          <CuratedBadge story={story} />
          {draft
            ? <span>{t('draft')}</span>
            : story.publishedAt && <time dateTime={story.publishedAt}>{new Date(story.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>}
        </div>
        <h2 className="feed-card-title" {...scriptProps(text)}><button type="button">{text?.title ?? story.title}</button></h2>
        <p className="feed-card-text" {...scriptProps(text)}>
          <KeywordText text={excerpt} spans={annotationsFor(story, text).body} story={story} hoverOnly />
        </p>
        <span className="feed-card-open">{t(draft ? 'continueDraft' : 'readStory')}<Icon name="arrow" /></span>
        {failure && <p className="content-status" role="alert">{t(failure)}</p>}
      </div>
    </article>
  );
});

/** The last step: a clear stopping point, and the paths out of it. */
function EndsStep({ resource }) {
  const { t } = useLanguage();
  const hasMore = Boolean(resource.meta?.pagination?.hasMore);
  if (hasMore) return <div className="feed-card feed-ends"><div className="feed-card-body">
    {resource.error ? <ResourceState resource={resource} /> : <LoadingState label="loadingMore" compact />}
  </div></div>;
  return (
    <div className="feed-card feed-ends">
      <div className="feed-card-body">
        <h2>{t(hasMore ? 'moreStories' : 'allRead')}</h2>
        <p>{t('tryAnotherPath')}</p>
        <div className="feed-ends-actions">
          <Link className="text-link" to="/app/keywords">{t('keywords')}<Icon name="arrow" /></Link>
          <Link className="text-link" to="/app/write">{t('write')}<Icon name="arrow" /></Link>
        </div>
        {resource.error && <ResourceState resource={resource} />}
      </div>
    </div>
  );
}

export default function StoryStage({ path, banner = null }) {
  const { t, contentPreference } = useLanguage();
  const { authorizedRequest } = useAuth();
  const resource = useResource(path, true);
  const stories = resource.data ?? [];

  const stage = useRef(null);
  useBrowseScroll(stage, resource.data !== null);
  const steps = useRef([]);
  const glide = useRef(() => {});
  const openedCard = useRef(null);
  const [active, setActive] = useState(0);
  const [opened, setOpened] = useState(null);
  const [reactions, setReactions] = useState({});
  const [failures, setFailures] = useState({});
  const sentinel = useInfiniteScroll(resource, { root: stage, rootMargin: '1600px 0px', paused: Boolean(opened) });

  // `authorizedRequest` is rebuilt whenever the session changes, and the prefetch
  // handler must not change with it — a card that re-renders when the session does
  // would undo the memoisation above.
  const send = useRef(authorizedRequest);
  useEffect(() => { send.current = authorizedRequest; });

  const loading = resource.data === null && !resource.error;
  const blank = !loading && !resource.error && stories.length === 0;
  // Loading, a failed first load, and an empty feed each get one card of their
  // own, so the stage always has something to show and never an unmeasured step.
  const count = loading || blank || (resource.error && stories.length === 0) ? 1 : stories.length + 1;
  const current = stories[active];

  // A full-screen glide the reader cannot take back would be a trap, so every
  // animation is cancellable and the newest one cancels the last. Unmounting
  // cancels too, or a route change would leave a handler writing to a detached node.
  useEffect(() => () => glide.current(), []);

  const go = useCallback((next) => {
    const container = stage.current;
    if (!container) return;
    const target = Math.max(0, Math.min(next, count - 1));
    const node = steps.current[target];
    if (!node) return;
    glide.current();
    glide.current = scrollDeck(container, node.offsetTop);
    setActive(target);
  }, [count]);

  useEffect(() => {
    if (opened || loading || blank || !stage.current) return;
    return attachDeckSnap(stage.current, () => steps.current.slice(0, count));
  }, [opened, loading, blank, count]);

  const prefetch = useCallback((id) => prefetchStory(id, send.current), []);

  // Warm only the settled, visible card. Fast scrolling cancels the timer,
  // and constrained connections keep the existing press/focus-only behavior.
  const currentId = current?.id;
  useEffect(() => {
    const connection = navigator.connection;
    if (!currentId || opened || connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;
    const timer = setTimeout(() => prefetch(currentId), 400);
    return () => clearTimeout(timer);
  }, [currentId, opened, prefetch]);

  // The card's own element is kept beside the open state so that closing hands the
  // reader back to the control they pressed — the keyboard path continues from the
  // card rather than from the top of the document.
  const open = useCallback((story, index, node) => {
    glide.current();
    openedCard.current = node;
    setOpened({ story, index, origin: node.getBoundingClientRect() });
  }, []);

  const close = useCallback(() => {
    openedCard.current?.querySelector('button')?.focus();
    setOpened(null);
  }, []);

  // Which step holds the middle band of the stage. Reading the band rather than
  // the step's own visibility keeps exactly one step active at a time.
  useEffect(() => {
    const container = stage.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) setActive(Number(entry.target.dataset.index));
    }, { root: container, rootMargin: '-45% 0px -45% 0px' });
    for (const node of steps.current.slice(0, count)) if (node) observer.observe(node);
    return () => observer.disconnect();
  }, [count]);

  // Arrow keys are the same deck control as the rail buttons. They stay out of the
  // way of typing, of browser and platform shortcuts, of any control that has
  // already claimed the key, and of an opened card, whose own keys are its own.
  useEffect(() => {
    function onKeyDown(event) {
      if (opened) return;
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const keys = { ArrowUp: active - 1, ArrowDown: active + 1, Home: 0, End: count - 1 };
      if (!(event.key in keys)) return;
      event.preventDefault();
      go(keys[event.key]);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, count, go, opened]);

  const reactionOf = (story) => reactions[story.id] ?? { liked: Boolean(story.viewerHasLiked), count: story.likeCount ?? 0, busy: false };

  async function appreciate(story) {
    if (!story) return;
    const state = reactionOf(story);
    if (state.busy) return;
    const id = story.id;
    setFailures((previous) => ({ ...previous, [id]: null }));
    setReactions((previous) => ({ ...previous, [id]: { ...state, busy: true } }));
    try {
      const result = await authorizedRequest(`/stories/${id}/like`, { method: state.liked ? 'DELETE' : 'POST' });
      const liked = Boolean(result.liked);
      setReactions((previous) => ({ ...previous, [id]: { liked, count: result.likeCount ?? Math.max(0, state.count + (liked ? 1 : -1)), busy: false } }));
    } catch (error) {
      setReactions((previous) => ({ ...previous, [id]: { ...state, busy: false } }));
      setFailures((previous) => ({ ...previous, [id]: errorMessage(error) }));
    }
  }

  // The last step has no story, so the rail falls back to an inert reading of
  // the count rather than reaching into a story that is not there.
  const reaction = current ? reactionOf(current) : { liked: false, count: 0, busy: false };

  return (
    <div className="feed-view">
      {banner && <div className="feed-banner">{banner}</div>}

      <div className="feed-stage" ref={stage} role="region" aria-label={t('feed')} tabIndex={0}>
        {/* `role="list"` keeps the sequence announced after `list-style: none`. */}
        <ol className="feed-deck" role="list">
          {loading && <li className="feed-step" data-index="0" ref={(node) => { steps.current[0] = node; }}>
            <div className="feed-card"><div className="feed-card-body feed-state-loading"><LoadingState label="loadingStories" /></div></div>
          </li>}

          {resource.error && stories.length === 0 && <li className="feed-step" data-index="0" ref={(node) => { steps.current[0] = node; }}>
            <div className="feed-card"><div className="feed-card-body"><ResourceState resource={resource} /></div></div>
          </li>}

          {blank && <li className="feed-step" data-index="0" ref={(node) => { steps.current[0] = node; }}>
            <div className="feed-card"><div className="feed-card-body"><div className="content-empty"><h2>{t('noStories')}</h2><p>{t('tryAnotherPath')}</p><Link className="text-link" to="/app/write">{t('write')}</Link></div></div></div>
          </li>}

          {stories.map((story, index) => <li className="feed-step" key={story.id} data-index={index} data-current={index === active} ref={(node) => { steps.current[index] = node; }}>
            <StageCard story={story} index={index} failure={failures[story.id]} onOpen={open} onPrefetch={prefetch} />
          </li>)}

          {stories.length > 0 && <li className="feed-step" data-index={stories.length} data-current={active === stories.length} ref={(node) => { steps.current[stories.length] = node; sentinel.current = node; }}>
            <EndsStep resource={resource} />
          </li>}
        </ol>
      </div>

      {/* Keyed on the story so a card arriving in front is a fresh rail — an open
          comment panel belongs to the story it was asked about, not to the deck. */}
      <FeedRail key={current?.id} story={current} reaction={reaction} onLike={appreciate}>
        <button type="button" className="feed-action" aria-label={t('previousStory')} title={t('previousStory')} disabled={active === 0} onClick={() => go(active - 1)}><Icon name="up" /></button>
        <button type="button" className="feed-action" aria-label={t('nextStory')} title={t('nextStory')} disabled={active >= count - 1} onClick={() => go(active + 1)}><Icon name="down" /></button>
      </FeedRail>

      {opened && <StoryReader
        card={opened.story}
        origin={opened.origin}
        reaction={reactionOf(opened.story)}
        onLike={appreciate}
        onClose={close}
      />}

      <p className="sr-only" aria-live="polite">{current ? `${active + 1} / ${stories.length} — ${textFor(current, contentPreference)?.title ?? current.title}` : t(loading || resource.meta?.pagination?.hasMore ? 'loadingContent' : 'allRead')}</p>
    </div>
  );
}
