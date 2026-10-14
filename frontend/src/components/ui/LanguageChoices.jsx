import { useLanguage } from '../../context/LanguageContext';
import { languages } from '../../i18n/messages';
import { translate } from '../../i18n/messages';
import Icon from './Icon';
export default function LanguageChoices() {
  const { locale, setLocale, t } = useLanguage();
  return <fieldset className="language-choices"><legend className="sr-only">{t('language')}</legend>
    {languages.map((item) => <label key={item.id} className="language-choice" data-selected={locale === item.id}>
      <input type="radio" name="interface-language" value={item.id} checked={locale === item.id} onChange={() => setLocale(item.id)} />
      <span className="language-choice-copy" lang={item.lang} dir={item.dir}><strong>{item.label}</strong><span>{translate('languageSample', item.id)}</span></span>
      <span className="choice-check" aria-hidden="true">{locale === item.id && <Icon name="check" />}</span>
    </label>)}
  </fieldset>;
}
