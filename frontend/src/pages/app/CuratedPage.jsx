import { useBrowseMemory } from '../../hooks/useBrowseMemory';
import PageHeading from '../../components/layout/PageHeading';
import StoryStage from '../../components/stories/StoryStage';
import { useLanguage } from '../../context/LanguageContext';

export default function CuratedPage() {
  const { t } = useLanguage();
  const { seed } = useBrowseMemory();
  return <>
    <PageHeading title={t('curated')} visible={false} />
    <StoryStage path={`/stories?curated=true&limit=6&seed=${seed}`} banner={<div className="curated-intro"><h1>{t('curated')}</h1><p>{t('curatedDescription')}</p></div>} />
  </>;
}
