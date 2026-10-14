import { useLanguage } from '../../context/LanguageContext';
export default function Button({ children, busy = false, busyLabel, className = '', ...props }) {
  const { t } = useLanguage();
  return <button {...props} disabled={busy || props.disabled} className={`button ${className}`} aria-busy={busy || undefined}>
    {busy && <span className="busy-mark" aria-hidden="true" />}<span>{busy && busyLabel ? busyLabel : children || t('working')}</span>
  </button>;
}
