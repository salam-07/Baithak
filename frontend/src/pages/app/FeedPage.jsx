import { useState } from 'react';
import PageHeading from '../../components/layout/PageHeading';
import StoryStage from '../../components/stories/StoryStage';
import { useLanguage } from '../../context/LanguageContext';

/**
 * The Feed opens on a story, not on the word "Feed".
 *
 * The only thing above the deck is the filter, and only when one is applied —
 * that one is not a label repeating the navigation, it is the reason the reader
 * is not seeing everything.
 *
 * The deck is shuffled: every mount draws a seed and sends it to the API, so a
 * reload deals the stories out in a new order. The seed is drawn in state and
 * deliberately kept out of the address bar, which is what makes those two
 * behaviours fall out of one value. A URL the reader could reload would replay
 * the same shuffle, and the seed staying put for the life of the mount is what
 * lets "Load more" continue the same deal instead of re-dealing from the top and
 * showing stories twice.
 */
export default function FeedPage() {
  const { t } = useLanguage();
  const [seed] = useState(() => Math.floor(Math.random() * 1_000_000));
  const query = new URLSearchParams({ limit: '12', seed: String(seed) });
  const path = `/stories?${query}`;
  return <>
    <PageHeading title={t('feed')} visible={false} />
    <StoryStage key={path} path={path} />
  </>;
}
