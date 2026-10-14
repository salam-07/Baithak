import usePageTitle from '../../hooks/usePageTitle';

/**
 * A surface's title, and optionally the heading that shows it.
 *
 * Some pages open straight into their content — the Feed begins with a story,
 * Explore begins with its one-line invitation — and a heading that only repeats
 * the navigation label spends a screen's worth of attention saying nothing.
 * Those pages pass `visible={false}`: the tab still names them, the page does
 * not. Pass `visible` back in wherever the title carries information the page
 * does not otherwise give, such as a story's own name.
 */
export default function PageHeading({ title, titleContent, children, textProps = {}, visible = true }) {
  usePageTitle(title);
  if (!visible) return children ?? null;
  return <header className="page-heading"><h1 {...textProps}>{titleContent ?? title}</h1>{children}</header>;
}
