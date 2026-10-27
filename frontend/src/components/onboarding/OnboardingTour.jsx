import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { readStorage, writeStorage } from '../../lib/storage';
import { tourRouteStatus } from '../../lib/tourNavigation';
import { keywordText } from '../../lib/keywordPresentation';
import KeywordText from '../stories/KeywordText';
import Icon from '../ui/Icon';
import '../../styles/onboarding.css';

const seenInMemory = new Set();
const steps = [
  { name: 'Language', target: '.site-header .language-switch', icon: 'language' },
  { name: 'Feed', target: '.feed-stage', icon: 'feed' },
  { name: 'Word', target: '.feed-step[data-current="true"] .keyword-mark, .feed-stage', icon: 'book' },
  { name: 'Write', route: '/app/write', target: '#story-language', icon: 'write' },
  { name: 'Translation', route: '/app/translation', target: '.translation-page .empty-copy', icon: 'language' },
  { name: 'Curated', route: '/app/curated', target: '.curated-intro', icon: 'curated' },
  { name: 'Keywords', route: '/app/keywords', target: '.keyword-grid', icon: 'book' },
];

// Mount this above the routes: home and /app use different layout branches.
export default function OnboardingTour() {
  const { user, status, restoreError } = useAuth();
  const { pathname } = useLocation();
  const inApp = pathname.startsWith('/app') || (pathname === '/' && user);
  if (!inApp || (status !== 'ready' && !user) || restoreError || user?.onboardingCompleted === false) return null;
  return <Tour key={user?.id || 'guest'} />;
}

function WordExample() {
  const { authorizedRequest } = useAuth();
  const { locale, t } = useLanguage();
  const [word, setWord] = useState(null);
  const request = useRef(authorizedRequest);
  useEffect(() => {
    const controller = new AbortController();
    request.current('/keywords?limit=1', { signal: controller.signal })
      .then(words => setWord(words[0] || null)).catch(() => {});
    return () => controller.abort();
  }, []);
  if (!word) return <p className="tour-note">{t('tourWordFallback')}</p>;
  const label = keywordText(word.labels, locale, word.key);
  const id = String(word._id || word.id);
  const story = { keywords: [{ ...word, _id: id }] };
  return <div className="tour-example">
    <span>{t('tourTryWord')}</span>
    <span lang={label.lang} dir={label.dir}><KeywordText text={label.text} spans={[{ start: 0, end: label.text.length, keywordIds: [id] }]} story={story} /></span>
  </div>;
}

function Tour() {
  const { user, updateProfile } = useAuth();
  const { t, language, locale } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const storageKey = `baithak.tour.v1.${user?.id || 'guest'}`;
  const [open, setOpen] = useState(() => !seenInMemory.has(storageKey) && !readStorage(storageKey, false) && (!user || user.tourCompleted === false));
  const [index, setIndex] = useState(0);
  const panel = useRef(null);
  const focusNext = useRef(false);
  const initialFocus = useRef(document.activeElement);
  const expectedPath = useRef(pathname);
  const pendingNavigation = useRef(null);
  const started = useRef(false);
  const acknowledged = useRef(false);
  const saveProfile = useRef(updateProfile);
  const signedIn = Boolean(user);
  const step = steps[index];
  const feedPath = signedIn ? '/' : '/app';
  const target = index === 3 && !signedIn ? '[data-destination="create"]' : step.target;

  // Claim the one-time visit on entry, so reloads and Skip never repeat it.
  // Local storage also covers an offline profile update; the server flag covers devices.
  useEffect(() => {
    if (!open || started.current) return;
    started.current = true;
    seenInMemory.add(storageKey);
    writeStorage(storageKey, true);
    expectedPath.current = feedPath;
    if (pathname !== feedPath) {
      pendingNavigation.current = { from: pathname, to: feedPath };
      navigate(feedPath, { replace: true });
    }
  }, [open, storageKey, signedIn, feedPath, pathname, navigate]);

  useEffect(() => {
    if (!signedIn || user.tourCompleted !== false || acknowledged.current || (!open && !readStorage(storageKey, false))) return;
    acknowledged.current = true;
    // Retry on the next visit if the first acknowledgment could not reach the server.
    void saveProfile.current({ tourCompleted: true }).catch(() => {});
  }, [signedIn, user?.tourCompleted, open, storageKey]);

  useEffect(() => {
    if (!open) return;
    const routeStatus = tourRouteStatus(pathname, expectedPath.current, pendingNavigation.current);
    if (routeStatus === 'pending') return;
    pendingNavigation.current = null;
    if (index === 2 && pathname.startsWith('/app/words/')) {
      expectedPath.current = pathname;
      return;
    }
    // Exploring a link leaves the tour naturally, without pulling the reader back.
    if (routeStatus === 'left') {
      const frame = requestAnimationFrame(() => setOpen(false));
      return () => cancelAnimationFrame(frame);
    }
  }, [pathname, open, index]);

  // Position against live geometry, including async content, RTL and the mobile dock.
  // The page stays interactive; the outline and its pointer never intercept input.
  useLayoutEffect(() => {
    if (!open) return;
    const node = panel.current;
    let observed;
    let frame;
    const resize = new ResizeObserver(() => schedule());
    resize.observe(node);
    function measure() {
      const viewport = window.visualViewport;
      const width = viewport?.width || window.innerWidth;
      const height = viewport?.height || window.innerHeight;
      const vx = viewport?.offsetLeft || 0;
      const vy = viewport?.offsetTop || 0;
      const anchor = [...document.querySelectorAll(target)].find(item => item.getBoundingClientRect().width > 0);
      if (anchor !== observed) {
        if (observed) { resize.unobserve(observed); observed.removeAttribute('data-tour-focus'); }
        observed = anchor;
        if (observed) { resize.observe(observed); observed.setAttribute('data-tour-focus', ''); }
      }
      const rect = anchor?.getBoundingClientRect();
      const dock = width <= 680 ? document.querySelector('.main-navigation')?.getBoundingClientRect() : null;
      const floor = Math.min(vy + height - 12, dock?.top > vy ? dock.top - 12 : vy + height - 12);
      node.style.maxHeight = `${Math.max(160, floor - vy - 12)}px`;
      const pw = node.offsetWidth;
      const ph = node.offsetHeight;
      const visible = rect && rect.bottom > vy && rect.top < floor;
      let x = vx + (width - pw) / 2;
      let y = vy + Math.max(12, (floor - vy - ph) / 2);
      let side = 'none';
      if (visible) {
        const below = floor - rect.bottom - 18;
        const above = rect.top - vy - 30;
        if (below >= ph) { side = 'below'; y = rect.bottom + 18; }
        else if (above >= ph) { side = 'above'; y = rect.top - ph - 18; }
        else if (rect.width < width * .45 && width > 680) {
          side = 'right'; x = rect.right + 18; y = rect.top;
        } else {
          // Large story surfaces get a reading note at their lower edge.
          y = floor - ph;
        }
        if (side !== 'right') x = rect.left + rect.width / 2 - pw / 2;
      }
      x = Math.max(vx + 12, Math.min(x, vx + width - pw - 12));
      y = Math.max(vy + 12, Math.min(y, floor - ph));
      node.style.left = `${Math.round(x)}px`;
      node.style.top = `${Math.round(y)}px`;
      node.style.setProperty('--tour-pointer', `${Math.max(24, Math.min(pw - 24, (rect?.left || x) + (rect?.width || pw) / 2 - x))}px`);
      node.dataset.side = side;
      node.dataset.ready = 'true';
    }
    function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
    measure();
    const mutations = new MutationObserver(schedule);
    mutations.observe(document.getElementById('page-content') || document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect(); mutations.disconnect();
      observed?.removeAttribute('data-tour-focus');
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [open, target, index, locale, pathname]);

  useEffect(() => {
    if (!open) return;
    const appRoot = document.getElementById('root');
    let ready;
    function reveal() {
      if (appRoot?.inert) return;
      ready?.disconnect();
      if (index > 0 || focusNext.current) panel.current?.querySelector('.tour-next')?.focus({ preventScroll: true });
      else panel.current?.focus({ preventScroll: true });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        panel.current?.animate?.([
          { opacity: 0, transform: 'translateY(8px) scale(.98)', clipPath: 'inset(0 0 8% 0 round 14px)' },
          { opacity: 1, transform: 'translateY(0) scale(1)', clipPath: 'inset(-30px round 14px)' },
        ], { duration: 360, easing: 'cubic-bezier(.16, 1, .3, 1)' });
      }
    }
    const frame = requestAnimationFrame(reveal);
    if (appRoot?.inert) {
      ready = new MutationObserver(reveal);
      ready.observe(appRoot, { attributes: true, attributeFilter: ['inert'] });
    }
    function escape(event) {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('.keyword-popover:popover-open')) return;
      setOpen(false);
      if (initialFocus.current?.isConnected) initialFocus.current.focus({ preventScroll: true });
    }
    document.addEventListener('keydown', escape);
    return () => { cancelAnimationFrame(frame); ready?.disconnect(); document.removeEventListener('keydown', escape); };
  }, [open, index, pathname]);

  function close() {
    setOpen(false);
    const destination = document.querySelector(index === 6 ? '.keyword-card' : target);
    const focusable = destination?.matches('a, button, input, select') ? destination : destination?.querySelector('button, input, a');
    (focusable || document.getElementById('page-content'))?.focus({ preventScroll: true });
  }
  function go(next) {
    focusNext.current = true;
    const route = steps[next].route;
    const path = next === 3 && !signedIn ? feedPath : route || feedPath;
    expectedPath.current = path;
    pendingNavigation.current = pathname !== path ? { from: pathname, to: path } : null;
    if (pathname !== path) navigate(path);
    setIndex(next);
  }
  if (!open) return null;
  return <div className="application-ui baithak-shell tour-root" lang={language.lang} dir={language.dir}>
    <section ref={panel} className="tour-tip" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-body" tabIndex={-1}>
      <div className="tour-progress" role="progressbar" aria-label={t('tourProgress')} aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
        {steps.map((item, i) => <span key={item.name} data-filled={i <= index} />)}
      </div>
      <div className="tour-topline"><span className="tour-symbol" aria-hidden="true"><Icon name={step.icon} /></span><span className="tour-count" aria-hidden="true">{index + 1} / {steps.length}</span><button type="button" className="tour-skip" onClick={close}>{t('tourSkip')}</button></div>
      <div key={step.name} className="tour-copy" aria-live="polite" aria-atomic="true">
        <h2 id="tour-title">{t(`tour${step.name}Title`)}</h2>
        <p id="tour-body">{t(`tour${step.name}Body`)}</p>
        {index === 2 && <WordExample />}
        {index === 3 && !signedIn && <p className="tour-note">{t('tourGuestWrite')}</p>}
      </div>
      <div className="tour-actions">
        <button type="button" className="tour-back" disabled={index === 0} onClick={() => go(index - 1)}>{t('tourBack')}</button>
        <button type="button" className="tour-next" onClick={() => index === steps.length - 1 ? close() : go(index + 1)}>{t(index === steps.length - 1 ? 'tourDone' : 'tourNext')}<Icon name="arrow" /></button>
      </div>
    </section>
  </div>;
}
