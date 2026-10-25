import { useBrowseMemory } from '../../hooks/useBrowseMemory';
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
 * The shuffle and loaded pages survive navigation in a bounded memory cache.
 * Reloading clears that cache and deals a fresh order. Pagination keeps the
 * same seed so returning readers continue the same deal.
 */
export default function FeedPage() {
  const { t } = useLanguage();
  const { seed } = useBrowseMemory();
  const query = new URLSearchParams({ limit: '6', seed: String(seed) });
  const path = `/stories?${query}`;
  return <>
    <PageHeading title={t('feed')} visible={false} />
    <StoryStage key={path} path={path} />
  </>;
}
