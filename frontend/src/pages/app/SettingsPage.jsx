import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import LanguageChoices from '../../components/ui/LanguageChoices';
import PageHeading from '../../components/layout/PageHeading';
export default function SettingsPage() {
  const { t } = useLanguage();
  return <section className="workspace-page"><PageHeading title={t('settings')}><Link className="text-link" to="/app/profile">{t('profile')}</Link></PageHeading><div className="settings-section">
    <h2>{t('preference')}</h2><p>{t('preferenceNote')}</p><LanguageChoices />
  </div></section>;
}

