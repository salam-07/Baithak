import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Brand from '../ui/Brand';
import LanguageSwitch from '../ui/LanguageSwitch';
import Icon from '../ui/Icon';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
export default function SiteLayout() {
  const { t, language, preferenceNotice } = useLanguage();
  const { status } = useAuth();
  const { pathname } = useLocation();
  const inApp = pathname === '/' || pathname === '/app' || pathname.startsWith('/app/');
  const root = useRef(null);
  const header = useRef(null);
  useEffect(() => {
    const measure = () => root.current?.style.setProperty('--header-height', `${header.current?.offsetHeight || 80}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header.current);
    return () => observer.disconnect();
  }, [inApp]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('page-content')?.focus({ preventScroll: true });
  }, [pathname, status]);
  return <div ref={root} className={`application-ui${inApp ? ' baithak-shell' : ''}`} lang={language.lang} dir={language.dir}>
    <a className="skip-link" href="#page-content">{t('skip')}</a>
    <header ref={header} className="site-header"><Brand /><LanguageSwitch /></header>
    <div className="preference-notice" role="status" aria-live="polite" aria-atomic="true">
      {preferenceNotice && <span key={preferenceNotice}><Icon name="check" />{t(preferenceNotice)}</span>}
    </div>
    <Outlet />
  </div>;
}



