import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';

export default function LoadingState({ label = 'loadingContent', kind = 'story', compact = false }) {
  const { t } = useLanguage();
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 7000);
    return () => clearTimeout(timer);
  }, []);
  return <div className={`loading-state loading-state--${kind}${compact ? ' loading-state--compact' : ''}`} role="status" aria-live="polite">
    <div className="loading-caption"><span className="loading-dot" aria-hidden="true" /><span>{t(label)}</span></div>
    {!compact && <div className="loading-shape" aria-hidden="true">
      {kind === 'directory' ? [0, 1, 2, 3].map(row => <div className="loading-row" key={row}><span /><span /></div>) : <>
        <span className="loading-line loading-line--title" />
        <span className="loading-line loading-line--meta" />
        <div className="loading-paragraph"><span className="loading-line" /><span className="loading-line" /><span className="loading-line loading-line--short" /></div>
        {kind !== 'word' && <div className="loading-paragraph"><span className="loading-line" /><span className="loading-line loading-line--short" /></div>}
      </>}
    </div>}
    {slow && <p className="loading-slow">{t('loadingSlow')}</p>}
  </div>;
}
