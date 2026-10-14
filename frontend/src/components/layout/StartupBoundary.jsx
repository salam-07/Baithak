import { useLayoutEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

// The HTML splash is visible before React or the app bundle has loaded.
export default function StartupBoundary({ children }) {
  const { status } = useAuth();
  const { t, language } = useLanguage();
  useLayoutEffect(() => {
    const splash = document.getElementById('startup-splash');
    if (!splash) return;
    splash.lang = language.lang;
    splash.dir = language.dir;
    splash.querySelector('[data-startup-label]').textContent = t('startingApp');
    splash.querySelector('[data-startup-help]').textContent = t('startupSlow');
    splash.querySelector('button').textContent = t('reloadApp');
    if (status !== 'ready') return;
    window.dispatchEvent(new Event('baithak:ready'));
    const root = document.getElementById('root');
    const finish = () => {
      splash.remove();
      root.inert = false;
    };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !splash.animate) {
      finish(); return;
    }
    const animation = splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'ease-out', fill: 'forwards' });
    animation.finished.then(finish, () => {});
    return () => animation.cancel();
  }, [status, t, language]);
  return children;
}
