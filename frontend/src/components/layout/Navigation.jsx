import { useAuth } from '../../context/AuthContext';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../ui/Icon';

const destinations = [
  { name: 'create', to: '/app/write' },
  { name: 'feed', to: '/app' },
  { name: 'curated', to: '/app/curated' },
  { name: 'keywords', to: '/app/keywords' },
  { name: 'search', to: '/app/search' },
  { name: 'translation', to: '/app/translation' },
  { name: 'profile', to: '/app/profile' },

];

// One moving selection, shared by the desktop index and the mobile dock.
export default function Navigation() {
  const { t, locale } = useLanguage();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const nav = useRef(null);
  const marker = useRef(null);
  const popup = useRef(null);
  const popupId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const secondaryActive = ['/app/translation', '/app/profile', '/app/search'].some(path => pathname.startsWith(path));
  useEffect(() => {
    const panel = popup.current;
    panel?.hidePopover();
    const desktop = window.matchMedia('(min-width: 681px)');
    const close = () => { if (desktop.matches) panel?.hidePopover(); };
    desktop.addEventListener('change', close);
    return () => desktop.removeEventListener('change', close);
  }, [pathname]);
  useLayoutEffect(() => {
    const node = nav.current;
    const measure = () => {
      const active = [...node.querySelectorAll(':scope > .nav-link.active')].find(item => item.offsetWidth);
      if (!active || !active.offsetWidth) { marker.current.style.opacity = '0'; return; }
      marker.current.style.width = `${active.offsetWidth}px`;
      marker.current.style.height = `${active.offsetHeight}px`;
      marker.current.style.transform = `translate(${active.offsetLeft}px, ${active.offsetTop}px)`;
      marker.current.style.opacity = '1';
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    for (const item of node.querySelectorAll('a')) observer.observe(item);
    return () => observer.disconnect();
  }, [pathname, locale]);
  return <nav ref={nav} className="main-navigation" aria-label={t('navigation')}>
    <span ref={marker} className="nav-marker" aria-hidden="true" />
    <button type="button" className={`nav-link nav-menu-toggle${secondaryActive ? ' active' : ''}`} popoverTarget={popupId} aria-expanded={menuOpen} aria-controls={popupId}>
      <span className="nav-icon"><Icon name="menu" /></span><span className="nav-label">{t('navigationMenu')}</span>
    </button>
    {destinations.map(({ name, to }) => {
      const active = name === 'feed'
        ? ['/', '/app', '/app/feed'].includes(pathname) || pathname.startsWith('/app/stories/')
        : name === 'keywords'
          ? pathname === to || pathname === '/app/explore' || pathname.startsWith('/app/words/') || pathname.startsWith('/app/keywords/')
          : pathname === to || pathname.startsWith(`${to}/`);
      return <Link className={`nav-link${active ? ' active' : ''}${name === 'create' ? ' nav-create' : ''}${['search', 'translation', 'profile'].includes(name) ? ' nav-secondary' : ''}`} data-destination={name} aria-current={active ? 'page' : undefined} key={name} to={name === 'feed' && user ? '/' : to}>
        <span className="nav-icon"><Icon name={name === 'create' ? 'write' : name === 'keywords' ? 'book' : name === 'translation' ? 'language' : name} /></span><span className="nav-label">{t(name)}</span>
      </Link>;
    })}
    <div ref={popup} id={popupId} popover="auto" className="nav-popup" onToggle={event => setMenuOpen(event.newState === 'open')}>
      {destinations.filter(({ name }) => ['search', 'translation', 'profile'].includes(name)).map(({ name, to }) => <Link
        key={name} to={to} className="nav-popup-link" aria-current={pathname.startsWith(to) ? 'page' : undefined}
        onClick={() => popup.current?.hidePopover()}>
        <Icon name={name === 'translation' ? 'language' : name} /><span>{t(name)}</span>
      </Link>)}
    </div>
  </nav>;
}


