import { useLanguage } from '../../context/LanguageContext';
import PageHeading from '../../components/layout/PageHeading';

export default function PlaceholderPage({ page }) {
  const { t } = useLanguage();
  return <section className="workspace-page discovery-page translation-page"><PageHeading title={t(page)} />
    <div className="empty-state"><div className="empty-copy">
      <h2>{t(`${page}Soon`)}</h2>
      <p>{t('translationCurrent')}</p>
      <p>{t('translationCommunity')}</p>
      <p>{t('translationContact')}</p>
      <a href="mailto:baithak@echosocial.site" className="text-link" dir="ltr">baithak@echosocial.site</a>
    </div></div>
  </section>;
}
