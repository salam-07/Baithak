import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import glyphs from '../landing/logo-paths.json';

// Match the pre-JavaScript splash while a route chunk is loading. The logo is
// outlined SVG, so it needs neither a font download nor the landing animation.
export default function StartupLoading() {
  const { t, language } = useLanguage();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 10000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="startup-splash" role="status" aria-live="polite" lang={language.lang} dir={language.dir}>
    <div className="startup-center">
      <svg className="startup-logo" viewBox="-65 -1940 4220 2460" aria-hidden="true" focusable="false">
        {glyphs.map((glyph, index) => <path key={index} fill="currentColor" d={glyph.d} />)}
      </svg>
      <span className="startup-label">{t('startingApp')}</span>
      {slow && <div className="startup-help"><p>{t('startupSlow')}</p><button type="button" onClick={() => window.location.reload()}>{t('reloadApp')}</button></div>}
    </div>
  </div>;
}
