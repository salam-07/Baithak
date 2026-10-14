import { useAuth } from '../../context/AuthContext';
import { useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../ui/Icon';

const destinations = [
  { name: 'feed', to: '/app' },
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
  useLayoutEffect(() => {
    const node = nav.current;
    const measure = () => {
      const active = node.querySelector('[aria-current="page"]');
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
    {destinations.map(({ name, to }) => {
      const active = name === 'feed'
        ? ['/', '/app', '/app/feed'].includes(pathname) || pathname.startsWith('/app/stories/')
        : name === 'keywords'
          ? pathname === to || pathname === '/app/explore' || pathname.startsWith('/app/words/') || pathname.startsWith('/app/keywords/')
          : pathname === to || pathname.startsWith(`${to}/`);
      return <Link className={`nav-link${active ? ' active' : ''}`} data-destination={name} aria-current={active ? 'page' : undefined} key={name} to={name === 'feed' && user ? '/' : to}>
        <span className="nav-icon"><Icon name={name === 'keywords' ? 'book' : name === 'translation' ? 'language' : name} /></span><span className="nav-label">{t(name)}</span>
      </Link>;
    })}
  </nav>;
}


