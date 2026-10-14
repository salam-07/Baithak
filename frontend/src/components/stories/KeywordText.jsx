import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import '../../styles/keywords.css';
import { keywordText, keywordPreview } from '../../lib/keywordPresentation';

function KeywordTip({ children, words, story, hoverOnly }) {
  const { locale, t } = useLanguage();
  const id = useId();
  const anchor = useRef(null);
  const tip = useRef(null);
  const timer = useRef(null);
  const motion = useRef(null);
  const pointer = useRef(null);
  const pinned = useRef(false);
  const suppressFocus = useRef(false);
  const [selected, setSelected] = useState(0);
  const current = words[selected] || words[0];
  const name = keywordText(current.labels, locale, current.key);
  const openLabel = name.text + ' — ' + t('keywordLearn');
  function restoreFocus() { suppressFocus.current = true; anchor.current?.focus({ preventScroll: true }); suppressFocus.current = false; }
  // Only a mark that is a control can be expanded or controlled; in the closed card it
  // is a span, and an `aria-expanded` on one describes nothing.
  function setExpanded(value) { if (!hoverOnly) anchor.current?.setAttribute('aria-expanded', value); }

  const position = useCallback(() => {
    const trigger = anchor.current;
    const panel = tip.current;
    if (!trigger || !panel?.matches(':popover-open')) return;
    const rects = [...trigger.getClientRects()];
    const point = pointer.current;
    const box = rects.find(rect => point && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom) || rects[0];
    if (!box) return;
    const viewport = window.visualViewport;
    const width = viewport?.width ?? window.innerWidth;
    const height = viewport?.height ?? window.innerHeight;
    const left = viewport?.offsetLeft ?? 0;
    const top = viewport?.offsetTop ?? 0;
    const mobile = width <= 680;
    const dock = mobile ? document.querySelector('.main-navigation')?.getBoundingClientRect() : null;
    const bottom = Math.min(top + height, dock && dock.top > top ? dock.top : top + height) - 12;
    const header = trigger.closest('.feed-overlay') ? null : document.querySelector('.site-header')?.getBoundingClientRect();
    const ceiling = Math.max(top + 12, header && header.bottom > top ? header.bottom + 8 : top + 12);
    panel.dataset.detached = box.bottom < ceiling || box.top > bottom ? 'true' : 'false';
    const available = Math.max(80, bottom - ceiling);
    panel.style.width = Math.min(mobile ? 296 : 360, width - 24) + 'px';
    const surface = panel.firstElementChild;
    // offsetHeight ignores the entrance transform, so scrolling cannot make it drift.
    const panelHeight = Math.min(surface.scrollHeight + 2, mobile ? 360 : 480, available);
    const panelWidth = panel.offsetWidth;
    const center = box.left + box.width / 2;
    const x = Math.max(left + 12, Math.min(center - panelWidth / 2, left + width - panelWidth - 12));
    const below = bottom - box.bottom - 12;
    const above = box.top - ceiling - 12;
    const side = below >= panelHeight || below >= above ? 'below' : 'above';
    const room = Math.max(80, side === 'below' ? below : above);
    panel.style.maxHeight = Math.min(mobile ? 360 : 480, available, room) + 'px';
    const finalHeight = surface.offsetHeight;
    const y = side === 'below' ? box.bottom + 12 : box.top - finalHeight - 12;
    panel.style.left = x + 'px';
    panel.style.top = Math.max(ceiling, Math.min(y, bottom - finalHeight)) + 'px';
    panel.dataset.side = side;
    panel.style.setProperty('--pointer-x', Math.max(18, Math.min(center - x, panelWidth - 18)) + 'px');
    panel.style.transformOrigin = `${center - x}px ${side === 'below' ? 'top' : 'bottom'}`;
  }, []);

  function open() {
    clearTimeout(timer.current);
    const panel = tip.current;
    const opening = !panel.matches(':popover-open');
    if (opening) panel.showPopover();
    setExpanded('true');
    position();
    if (!opening || !panel.animate) return;
    motion.current?.cancel();
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const below = panel.dataset.side === 'below';
    motion.current = panel.animate(reduced ? [{ opacity: .7 }, { opacity: 1 }] : [
      { opacity: .65, transform: `translateY(${below ? -6 : 6}px) scale(.96, .92)`, clipPath: below ? 'inset(-8px -8px 26% -8px)' : 'inset(26% -8px -8px -8px)' },
      { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(-8px -8px -8px -8px)' },
    ], { duration: reduced ? 90 : 320, easing: 'cubic-bezier(.16, 1, .3, 1)' });
  }
  function close() {
    clearTimeout(timer.current);
    motion.current?.cancel();
    tip.current?.hidePopover();
    setExpanded('false');
    pinned.current = false;
  }
  function leave() {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!pinned.current && !tip.current?.contains(document.activeElement) && document.activeElement !== anchor.current) close();
    }, 220);
  }
  function escape(event) {
    if (event.key === 'Escape' && tip.current?.matches(':popover-open')) {
      event.preventDefault(); event.stopPropagation(); close(); restoreFocus();
    }
  }
  useLayoutEffect(() => { position(); }, [selected, locale, position]);
  useEffect(() => {
    const panel = tip.current;
    const viewport = window.visualViewport;
    const observer = new ResizeObserver(position);
    observer.observe(panel.firstElementChild);
    window.addEventListener('resize', position);
    window.addEventListener('scroll', position, true);
    viewport?.addEventListener('resize', position);
    viewport?.addEventListener('scroll', position);
    return () => {
      clearTimeout(timer.current);
      motion.current?.cancel();
      observer.disconnect();
      window.removeEventListener('resize', position);
      window.removeEventListener('scroll', position, true);
      viewport?.removeEventListener('resize', position);
      viewport?.removeEventListener('scroll', position);
    };
  }, [position]);
  /**
   * A mark inside a surface that opens on its own press — the closed feed card — is
   * hover only. There the press belongs to the surface: a tap opens the story, and the
   * meanings are read in the card that opens. So the mark is a span rather than a
   * button, with no click, no focus and no popover relationship to describe, and the
   * mouse is the only pointer that opens it. Touch is already excluded from the open
   * (only `mouse` pointerenter opens), so a phone never meets the tooltip here.
   */
  const openOnHover = event => { if (event.pointerType === 'mouse') { pointer.current = { x: event.clientX, y: event.clientY }; open(); } };
  const mark = hoverOnly
    ? <span className="keyword-mark" ref={anchor} onPointerEnter={openOnHover} onPointerLeave={leave}>{children}</span>
    : <button type="button" className="keyword-mark" ref={anchor} aria-haspopup="dialog" aria-expanded="false" aria-controls={id}
      onPointerEnter={openOnHover} onPointerLeave={leave}
      onFocus={event => { if (!suppressFocus.current && event.currentTarget.matches(':focus-visible')) { pointer.current = null; open(); } }} onBlur={leave}
      onClick={event => { if (pinned.current && tip.current.matches(':popover-open')) close(); else { if (event.detail) pointer.current = { x: event.clientX, y: event.clientY }; pinned.current = true; open(); } }}>{children}</button>;
  return <span className="keyword-inline" onKeyDown={escape}>
    {mark}
    <span ref={tip} id={id} popover="auto" role="dialog" aria-labelledby={id + '-name'} className="keyword-popover"
      onToggle={event => { if (event.newState === 'closed') { pinned.current = false; setExpanded('false'); } }}
      onPointerEnter={() => clearTimeout(timer.current)} onPointerLeave={leave} onBlur={leave}>
      <Link className="keyword-open" to={'/app/words/' + current.key} aria-label={openLabel} />
      <span className="keyword-popover-surface">
        <span className="keyword-popover-head">
          <span className="keyword-name" id={id + '-name'} role="heading" aria-level="2" lang={name.lang} dir={name.dir}>{name.text}</span>
          <button className="keyword-dismiss" type="button" aria-label={t('keywordClose')} onClick={() => { close(); restoreFocus(); }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        </span>
        {words.map((word, index) => {
          const override = story.keywordSettings?.notes?.find(note => String(note.keyword) === String(word._id))?.explanation;
          const note = keywordText(word.notes, locale, t('keywordNoNote'));
          return <span className="keyword-meaning" key={word._id} hidden={index !== selected}>
            <span className="keyword-category">{t('keywordType_' + word.type)}{override ? ' · ' + t('keywordInStory') : ''}</span>
            <span className="keyword-explanation" dir={override ? 'auto' : note.dir} lang={override ? undefined : note.lang}>{override || keywordPreview(note.text, 190)}</span>
            {!override && note.language && note.language !== locale && <span className="keyword-fallback">{t('keywordFallback_' + note.language)}</span>}
          </span>;
        })}
        {words.length > 1 && <span className="keyword-choices" role="group" aria-label={t('keywordOverlap')}>
          <span className="keyword-choices-label">{t('keywordChooseMeaning')}</span>
          <span className="keyword-choice-list">{words.map((word, index) => {
            const label = keywordText(word.labels, locale, word.key);
            return <button type="button" key={word._id} aria-pressed={selected === index} onClick={() => setSelected(index)} lang={label.lang} dir={label.dir}>{label.text}</button>;
          })}</span>
        </span>}
      </span>
    </span>
  </span>;
}

export default function KeywordText({ text = '', spans = [], story, hoverOnly = false }) {
  const words = new Map((story?.keywords ?? []).map(word => [String(word._id), word]));
  const pieces = [];
  let position = 0;
  for (const span of spans) {
    if (span.start < position || span.end > text.length) continue;
    const meanings = span.keywordIds.map(id => words.get(id)).filter(Boolean);
    if (!meanings.length) continue;
    pieces.push(text.slice(position, span.start));
    pieces.push(<KeywordTip key={span.start} words={meanings} story={story} hoverOnly={hoverOnly}>{text.slice(span.start, span.end)}</KeywordTip>);
    position = span.end;
  }
  pieces.push(text.slice(position));
  return pieces;
}
