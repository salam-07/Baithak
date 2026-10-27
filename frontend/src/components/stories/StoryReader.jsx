import LoadingState from '../ui/LoadingState';
import CuratedBadge from './CuratedBadge';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';

import KeywordText from './KeywordText';
import { annotationsFor } from '../../lib/keywordAnnotations';
import FeedRail from './FeedRail';
import Icon from '../ui/Icon';
import { errorMessage } from '../../lib/api';
import { scriptProps, textFor } from '../../lib/storyText';
import { useLanguage } from '../../context/LanguageContext';
import { useStoryDetail } from '../../lib/storyDetail';

const OPEN_MOTION = { duration: 420, easing: 'cubic-bezier(.22, 1, .36, 1)' };
const CLOSE_MOTION = { duration: 220, easing: 'cubic-bezier(.4, 0, 1, 1)' };
const SCRIM_MOTION = { duration: 260, easing: 'ease-out' };
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The card, opened.
 *
 * The feed keeps each story's own route — `/app/stories/:id` still resolves, and
 * arriving from Explore or a shared link still lands there — but the feed never
 * uses it. Following that link from the middle of a deck reads as leaving the
 * room, so the card grows where it stands instead.
 *
 * It grows into a portal on `document.body`, which is what puts it above
 * everything: the shell's header sits at `z-index: 30` and the mobile navigation at
 * `35`, and both are inside the layout this leaves behind. Nothing is faded or
 * hidden underneath — the scrim simply covers it — so closing returns the reader to
 * a deck that was never disturbed.
 *
 * The root carries `application-ui` and `baithak-shell` because every rule that
 * draws a card or a line of story text is scoped to those two classes, and a
 * portal is only as styled as the classes it brings with it.
 */
export default function StoryReader({ card, origin, reaction, onLike, onClose, hideAuthor = false }) {
  const { t, locale, language, contentPreference } = useLanguage();
  const { story, error } = useStoryDetail(card.id);
  const root = useRef(null);
  const panel = useRef(null);
  const behind = useRef(null);
  const closing = useRef(false);
  const animations = useRef(new Set());
  // Whether the press that may become a click began on the scrim itself.
  const onScrim = useRef(false);
  const [chosen, setChosen] = useState(null);
  const titleId = useId();

  // The card's texts and the story's texts share a shape; the difference is that
  // the card truncates the body into an excerpt. Both therefore read the same way
  // here, and the text simply fills out when the fetch lands.
  const source = story ?? card;
  const texts = source.texts ?? [];
  const text = texts.find((item) => `${item.language}-${item.script}` === chosen) || textFor(source, contentPreference);
  const preferredAvailable = texts.some((item) => item.language === contentPreference.language && item.script === contentPreference.script);
  const author = source.author?.name || source.author?.username;

  function animate(node, frames, options) {
    const motion = node.animate(frames, options);
    const running = animations.current;
    running.add(motion);
    motion.finished.then(() => running.delete(motion), () => running.delete(motion));
    return motion;
  }

  useEffect(() => {
    const running = animations.current;
    return () => { for (const motion of running) motion.cancel(); running.clear(); };
  }, []);

  // The deck holds a screen of its own behind the scrim. Covering it stops a touch
  // from moving it; muting it stops the keyboard and a screen reader from reaching
  // it, which is what "above everything" has to mean for someone not using a
  // mouse. The selector is the shell and only the shell — this portal carries
  // `application-ui` too, and must not mute itself.
  useEffect(() => {
    const element = document.querySelector('.application-ui:not(.feed-overlay)');
    behind.current = element;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (element) element.inert = true;
    return () => {
      document.body.style.overflow = previousOverflow;
      if (element) element.inert = false;
    };
  }, []);

  // The scrim's fade is driven from here rather than from a CSS keyframe on this
  // same element and this same property. A keyframe holding its end state with
  // `fill: both` never lets go of `opacity`, so the close fade would be a second
  // animation stacked on top of a claim that never expired. Declared in a layout
  // effect, so the overlay's first paint is already frame zero of the fade.
  useLayoutEffect(() => {
    const node = root.current;
    if (!node?.animate || prefersReducedMotion()) return;
    const motion = animate(node, [{ opacity: 0 }, { opacity: 1 }], SCRIM_MOTION);
    return () => motion.cancel();
  }, []);

  // The card grows from where it was: measured against the panel it lands on, then
  // animated with a transform, so the whole open is settled on the compositor and
  // never touches layout. No fill is kept afterwards, and releasing the animation
  // the moment it lands leaves the reader with no composited layer to carry.
  useLayoutEffect(() => {
    const node = panel.current;
    if (!node) return;
    node.focus({ preventScroll: true });
    if (!origin || !node.animate || prefersReducedMotion()) return;
    const target = node.getBoundingClientRect();
    if (!target.width || !target.height) return;
    const motion = animate(node, [
      {
        transform: `translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${origin.width / target.width}, ${origin.height / target.height})`,
        opacity: 0.35,
      },
      { transform: 'none', opacity: 1 },
    ], OPEN_MOTION);
    motion.onfinish = () => motion.cancel();
    return () => motion.cancel();
  }, [origin]);

  function close() {
    if (closing.current) return;
    closing.current = true;
    const node = root.current;
    const cardNode = panel.current;
    const finish = () => {
      // Restore focusability only as the dialog leaves, before the deck restores
      // focus to the title that opened it.
      if (behind.current) behind.current.inert = false;
      onClose();
    };
    if (!node?.animate || prefersReducedMotion()) { finish(); return; }

    // Capture presentation values before cancelling: Escape during opening should
    // reverse the current frame, rather than jumping to the fully opened card.
    const scrimOpacity = getComputedStyle(node).opacity;
    const cardStyle = cardNode && getComputedStyle(cardNode);
    const transform = cardStyle?.transform;
    const opacity = cardStyle?.opacity;
    let destination = 'none';
    if (cardNode && origin && cardNode.offsetWidth && cardNode.offsetHeight) {
      const rect = cardNode.getBoundingClientRect();
      const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
      const left = rect.left - matrix.m41;
      const top = rect.top - matrix.m42;
      destination = `translate(${origin.left - left}px, ${origin.top - top}px) scale(${origin.width / cardNode.offsetWidth}, ${origin.height / cardNode.offsetHeight})`;
    }
    for (const motion of animations.current) motion.cancel();
    const motion = animate(node, [{ opacity: scrimOpacity }, { opacity: 0 }], { ...CLOSE_MOTION, fill: 'forwards' });
    if (cardNode?.animate) animate(cardNode, [
      { transform, opacity },
      { transform: destination, opacity: .35 },
    ], { ...CLOSE_MOTION, fill: 'forwards' });
    motion.finished.then(finish, () => {});
  }

  /* A press anywhere on the scrim closes the reader.
     Both ends of the gesture have to be on the scrim, not just the click: a click
     reports the nearest common ancestor of where the press began and where it
     ended, so selecting text in the card and releasing past its edge produces a
     click whose target is this element. Closing on that would throw the reader out
     mid-selection. */
  function onPointerDown(event) {
    onScrim.current = event.target === event.currentTarget;
  }

  function onClick(event) {
    if (onScrim.current && event.target === event.currentTarget) close();
  }

  function onKeyDown(event) {
    // The rail stops Escape when its comment panel is open, so this only ever sees
    // the key once the panel has had its turn.
    if (event.key === 'Escape') { event.stopPropagation(); close(); return; }
    if (event.key !== 'Tab' || !root.current) return;
    // `offsetParent` is null for anything `display: none`, which is how the rail's
    // closed comment panel leaves the ring without a second check for it.
    const nodes = [...root.current.querySelectorAll(FOCUSABLE)].filter((node) => node.offsetParent !== null);
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    // `at` is -1 for the card itself, which takes focus when it opens and is kept
    // out of `nodes` by its `tabindex="-1"`. Tabbing forward from there is the
    // browser's own next focusable and lands inside anyway; tabbing back would step
    // out of the dialog entirely, which is what the `<= 0` catches.
    const at = nodes.indexOf(document.activeElement);
    if (event.shiftKey && (at <= 0)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && at === nodes.length - 1) { event.preventDefault(); first.focus(); }
  }

  return createPortal(
    <div ref={root} className="application-ui baithak-shell feed-overlay" lang={language.lang} dir={language.dir} onPointerDown={onPointerDown} onClick={onClick} onKeyDown={onKeyDown}>
      {/* The dialog is the shell, not the card: the rail's Like, Comment and Close
          circles are part of what the reader is being given, and a `role="dialog"`
          on the card alone would put them outside it. The card keeps `tabIndex={-1}`
          so opening can land focus on the text rather than on the first control. */}
      <div className="feed-overlay-shell" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <article ref={panel} className="feed-card feed-overlay-card" tabIndex={-1}>
          <div className="feed-card-body">
            <div className="feed-card-head">
              {source.status === 'draft'
                ? <span>{t('draft')}</span>
                : source.publishedAt && <time dateTime={source.publishedAt}>{new Date(source.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</time>}
            </div>

            <h2 id={titleId} className="feed-overlay-title" {...scriptProps(text)}><KeywordText text={text?.title ?? source.title} spans={annotationsFor(story, text).title} story={story} /></h2>

            <div className="reader-byline"><CuratedBadge story={source} />{!hideAuthor && author && <span dir="auto">{author}</span>}</div>

            {texts.length > 1 && <div className="reader-versions">{texts.map((item) => <button key={`${item.language}-${item.script}`} type="button" aria-pressed={text === item} onClick={() => setChosen(`${item.language}-${item.script}`)}>{item.script === 'shahmukhi' ? 'پنجابی' : item.language === 'pa' ? 'Roman Punjabi' : 'English'}</button>)}</div>}
            {text && !preferredAvailable && <p className="content-note">{t('originalAvailable')}</p>}
            {text && !text.isOriginal && <p className="content-note">{t(text.source === 'community' ? 'communityTranslation' : 'authorTranslation')}</p>}

            {/* Until the fetch lands the reader is looking at the card's excerpt, ending
                in an ellipsis. Saying why is better than leaving them with a sentence
                that stops mid-thought and no reason for it. */}
            {!story && !error && <LoadingState label="loadingStory" compact />}
            {error && <p className="content-status" role="alert">{t(errorMessage(error))}</p>}

            <div className="story-body" {...scriptProps(text)}><KeywordText text={text?.body ?? text?.excerpt} spans={annotationsFor(story, text).body} story={story} /></div>

            {story && <Link className="text-link" to={'/app/stories/' + story._id}>{t('keywordStoryEdit')}</Link>}

            {source.keywords?.filter((word) => word.key).length > 0 && <section className="word-relations">
              <h2>{t('wordsInStory')}</h2>
              <div className="story-keywords">{source.keywords.filter((word) => word.key).map((word) => <Link key={word._id} dir="auto" to={`/app/words/${word.key}`}>{word.labels?.[locale] || word.labels?.en || word.key}</Link>)}</div>
            </section>}
          </div>
        </article>

        {/* The rail is driven by the card, never by the fetched story. The deck keys
            its reaction state on the card's id, the detail document arrives lean and
            so carries `_id` rather than `id`, and swapping one for the other mid-read
            would both miss the like call and reset the comment panel the moment the
            fetch landed. Reading is the only thing the fetched story is for. */}
        <FeedRail story={card} reaction={reaction} onLike={onLike}>
          <button type="button" className="feed-action" aria-label={t('closeStory')} title={t('closeStory')} onClick={close}><Icon name="close" /></button>
        </FeedRail>
      </div>
    </div>,
    document.body,
  );
}
