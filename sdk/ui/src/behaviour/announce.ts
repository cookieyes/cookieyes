/**
 * How long after the banner appears its title is announced. Right after a page
 * loads, a screen reader is usually still reading the navigation itself, and a
 * live-region update in that window is commonly dropped rather than queued. A
 * few hundred milliseconds of headroom avoids competing with it.
 */
export const ANNOUNCE_DELAY_MS = 700;

/**
 * Writes `text` to the banner's live region after {@link ANNOUNCE_DELAY_MS}.
 * `write` does the writing, so a framework can keep the text in its own state.
 * The cleanup cancels an announcement that has not happened yet.
 *
 * The live region is `aria-live="assertive"`: a consent prompt is important
 * enough to interrupt, and assertive is announced more consistently.
 */
export function announceBanner(text: string, write: (text: string) => void): () => void {
  const id = setTimeout(() => write(text), ANNOUNCE_DELAY_MS);
  return () => clearTimeout(id);
}
