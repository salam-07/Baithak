import { Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import Navigation from './Navigation';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../ui/Icon';
import '../../styles/workspace.css';
import '../../styles/content.css';
import '../../styles/discovery.css';

/**
 * The shell every application surface sits in: a header, a narrow index of
 * destinations, and the surface itself. There is no second margin column — the
 * reading area runs to the edge of the shell, so the only thing competing with
 * the reader's attention is the work they came to do.
 *
 * The Feed is the exception in one respect only. Its deck holds exactly one
 * screen and scrolls inside itself, so the shell stops reserving a page margin
 * and hands it a fixed height; `feed-route` in workspace.css carries the
 * arithmetic and stage.css carries the deck.
 */
const DECK_ROUTES = ['/', '/app', '/app/feed', '/app/curated'];

export default function AppLayout() {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const content = useRef(null);
  const deck = DECK_ROUTES.includes(pathname);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !content.current?.animate) return;
    const motion = content.current.animate([
      { opacity: .35, transform: 'translateY(5px)' },
      { opacity: 1, transform: 'translateY(0)' },
    ], { duration: 220, easing: 'cubic-bezier(.16, 1, .3, 1)' });
    return () => motion.cancel();
  }, [pathname]);
  return <div className={`app-layout${deck ? ' feed-route' : ''}`}>
    <aside className="app-sidebar">
      <Navigation />
      <div className="sidebar-colophon"><a href="https://echosocial.site" target="_blank" rel="noreferrer" className="colophon-brand" aria-label={t('tryEcho')}><span className="echo-wordmark" lang="en" dir="ltr">Echo</span><Icon name="arrow" /></a><p>{t('echoInvitation')}</p><p>{t('echoCreators')}</p></div>
    </aside>
    <main id="page-content" tabIndex={-1} className="app-content">
      {/* {welcome && <div className="welcome-note" role="status"><Icon name="check" />{t(welcome)}</div>} */}
      <div ref={content} className="app-route"><Outlet /></div>
    </main>
  </div>;
}
