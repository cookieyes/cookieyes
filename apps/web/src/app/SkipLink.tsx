/** The element every page marks as the start of its content. */
export const MAIN_CONTENT_ID = "main-content";

/**
 * "Skip to content": the first thing a keyboard user reaches on every page, so they can
 * pass the header and its links in one step. Hidden until it takes focus.
 */
export function SkipLink() {
  return (
    <a className="cy-skip-link" href={`#${MAIN_CONTENT_ID}`}>
      Skip to content
    </a>
  );
}
