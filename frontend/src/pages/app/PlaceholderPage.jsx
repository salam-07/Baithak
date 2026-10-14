import { Link } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import Icon from '../../components/ui/Icon';
import PageHeading from '../../components/layout/PageHeading';

export default function PlaceholderPage({ page }) {
  const { t } = useLanguage();
  return <section className="workspace-page discovery-page translation-page"><PageHeading title={t(page)} />
    <div className="empty-state"><div className="empty-copy">
      <h2>{t(`${page}Soon`)}</h2><p>{t('notReady')}</p>
      <Link to="/app/keywords" className="text-link">{t('browseKeywords')}<Icon name="arrow" /></Link>
    </div></div>
  </section>;
}
