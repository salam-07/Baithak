import { useState } from 'react';
import PageHeading from '../../components/layout/PageHeading';
import StoryStage from '../../components/stories/StoryStage';
import { useLanguage } from '../../context/LanguageContext';

export default function CuratedPage() {
  const { t } = useLanguage();
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  return <>
    <PageHeading title={t('curated')} visible={false} />
    <StoryStage path={`/stories?curated=true&limit=6&seed=${seed}`} banner={<div className="curated-intro"><h1>{t('curated')}</h1><p>{t('curatedDescription')}</p></div>} />
  </>;
}
