import { useEffect, useId, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import Icon from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

/**
 * The circles beside a story: appreciation, comments, and whatever control the
 * surface around it supplies.
 *
 * The deck and the opened card both show this rail, and the comment panel brings
 * behaviour of its own — focus moves into it when it opens, a press away from it
 * dismisses it, Escape hands the reader back to the button that opened it. Written
 * once here, it cannot drift between the two places a reader meets it.
 *
 * Escape is handled on the rail rather than on `document` so that the opened
 * card's own Escape handler, one level up the tree, sees the key only once the
 * panel has had its turn. `stopPropagation` makes that ordering explicit instead
 * of leaving it to whichever listener happened to be registered first, which two
 * document-level handlers could never settle.
 *
 * A panel answers about one story, so a rail that is handed a different one has to
 * start closed. That is the caller's job and it is a `key` (`key={story.id}`), not
 * something done in here: closing the panel in an effect on `story.id` would be a
 * second render of a surface that is about to be thrown away, and this deployment
 * treats a synchronous `setState` in an effect as an error. Keying remounts the
 * rail instead, which resets the panel at no cost — it holds no other state.
 */
export default function FeedRail({ story, reaction, onLike, children }) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const location = useLocation();
  const [panelOpen, setPanelOpen] = useState(false);
  const commentButton = useRef(null);
  const closeButton = useRef(null);
  const panel = useRef(null);
  const panelId = useId();

  useEffect(() => { if (panelOpen) closeButton.current?.focus(); }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    function onPointerDown(event) {
      if (commentButton.current?.contains(event.target)) return;
      if (panel.current?.contains(event.target)) return;
      setPanelOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [panelOpen]);

  function onKeyDown(event) {
    if (event.key !== 'Escape' || !panelOpen) return;
    event.stopPropagation();
    setPanelOpen(false);
    commentButton.current?.focus();
  }

  return (
    <div className="feed-rail" onKeyDown={onKeyDown}>
      <div className="feed-action-item">
        {user
          ? <button type="button" className="feed-action" aria-pressed={reaction.liked} aria-label={t(reaction.liked ? 'likedStory' : 'likeStory')} title={t(reaction.liked ? 'likedStory' : 'likeStory')} disabled={!story || reaction.busy} onClick={() => onLike(story)}><Icon name="like" /></button>
          : <Link className="feed-action" to="/login" state={{ from: location.pathname }} aria-label={t('signInToLike')} title={t('signInToLike')}><Icon name="like" /></Link>}
        {story && <span className="feed-action-count">{reaction.count}</span>}
      </div>

      <div className="feed-action-item feed-comment">
        <button ref={commentButton} type="button" className="feed-action" aria-expanded={panelOpen} aria-controls={panelId} aria-label={t('comments')} title={t('comments')} disabled={!story} onClick={() => setPanelOpen((open) => !open)}><Icon name="reply" /></button>
        <div ref={panel} className="feed-panel" id={panelId} hidden={!panelOpen} role="dialog" aria-labelledby={`${panelId}-title`}>
          <h2 id={`${panelId}-title`}>{t('comments')}</h2>
          <p>{t('commentsNotOpen')}</p>
          <button ref={closeButton} type="button" className="text-button" onClick={() => { setPanelOpen(false); commentButton.current?.focus(); }}>{t('close')}</button>
        </div>
      </div>

      <span className="feed-rail-rule" aria-hidden="true" />

      {children}
    </div>
  );
}
