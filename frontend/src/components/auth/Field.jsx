import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
export default function Field({ name, label, hint, error, prefix, type = 'text', ...props }) {
  const [visible, setVisible] = useState(false);
  const { t } = useLanguage();
  const password = type === 'password';
  return <div className="field">
    <label htmlFor={name}>{label}</label>
    <div className="field-control" data-invalid={Boolean(error)}>
      {prefix && <span className="field-prefix" aria-hidden="true">{prefix}</span>}
      <input id={name} name={name} type={password && visible ? 'text' : type}
        aria-invalid={Boolean(error)} aria-describedby={[hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(' ') || undefined} {...props} />
      {password && <button type="button" className="reveal" onClick={() => setVisible(!visible)} aria-controls={name} aria-pressed={visible}>{t(visible ? 'hide' : 'show')}</button>}
    </div>
    {hint && <p className="field-hint" id={`${name}-hint`}>{hint}</p>}
    {error && <p className="field-error" id={`${name}-error`}>{error}</p>}
  </div>;
}
