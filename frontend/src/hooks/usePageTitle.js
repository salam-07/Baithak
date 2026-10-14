import { useEffect } from 'react';

// The tab names the page even where the page itself does not. Surfaces that open
// straight into their content still deserve a title in the browser's tab list,
// so the document title is set separately from whether an h1 is drawn.
export default function usePageTitle(title) {
  useEffect(() => { document.title = `${title} · Baithak`; }, [title]);
}
