import { useId } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n/messages';
export default function LanguageSwitch() {
  const id = useId();
  const { locale, setLocale, t } = useLanguage();
  return <fieldset className="language-switch" dir="ltr">
    <legend className="sr-only">{t('language')}</legend>
    {languages.map((item) => <label key={item.id} className="language-mode">
      <input className="sr-only" type="radio" name={`${id}-language`} value={item.id}
        checked={locale === item.id} onChange={() => setLocale(item.id)} />
      <span lang={item.lang} dir={item.dir}>{item.label}</span>
    </label>)}
  </fieldset>;
}
