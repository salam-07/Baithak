import { useLanguage } from '../../context/LanguageContext';
import Icon from '../ui/Icon';

export default function CuratedBadge({ story }) {
  const { t } = useLanguage();
  if (!story?.isCurated) return null;
  return <span className="curated-badge" title={t('curatedDescription')}><Icon name="curated" /><span>{t('curated')}</span></span>;
}
