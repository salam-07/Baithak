import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { LanguageContext } from './LanguageContext';
import { languages, translate } from '../i18n/messages';
import { readStorage, writeStorage } from '../lib/storage';
export default function LanguageProvider({ children }) {
  const [locale, updateLocale] = useState(() => {
    const saved = readStorage('baithak.language', 'en');
    return languages.some((item) => item.id === saved) ? saved : 'en';
  });
  const [preferenceNotice, setNotice] = useState('');
  const noticeTimer = useRef(null);
  const { pathname } = useLocation();
  const { user, status, restoreError } = useAuth();
  const landing = pathname === '/' && status === 'ready' && !restoreError && !user;
  const language = languages.find((item) => item.id === locale);
  const setLocale = useCallback((next) => {
    const chosen = languages.find((item) => item.id === next);
    if (!chosen) return;
    updateLocale(next);
    const saved = writeStorage('baithak.language', next);
    const contentSaved = writeStorage('baithak.contentPreference', chosen.content);
    setNotice(saved && contentSaved ? 'saved' : 'notSaved');
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(''), 3500);
  }, []);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  useEffect(() => {
    document.documentElement.lang = landing ? 'en' : language.lang;
    document.documentElement.dir = landing ? 'ltr' : language.dir;
    writeStorage('baithak.contentPreference', language.content);
  }, [language, landing]);
  const t = useCallback((key) => translate(key, locale), [locale]);
  return <LanguageContext.Provider value={{ locale, setLocale, language, preferenceNotice, contentPreference: language.content, t }}>{children}</LanguageContext.Provider>;
}

