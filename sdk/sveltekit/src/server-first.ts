/**
 * Whether the page already holds markup Svelte rendered on the server. Svelte 5 exposes no public
 * "am I hydrating" signal, so this looks for the comment markers its server renderer writes
 * around blocks. A client-only mount into an empty target finds none. The same probe, and the
 * same reasoning, as `@cookieyes/svelte`'s provider, which keeps its own copy private: this root
 * has to decide the region before the provider is created.
 */
function pageHasServerMarkup(): boolean {
  if (typeof document === "undefined" || !document.body) return false;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_COMMENT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const data = (node as Comment).data;
    if (data === "[" || data === "]" || data === "") return true;
  }
  return false;
}

let claimed = false;

/**
 * @internal True during server rendering and for the first root on a page that already holds
 * server markup, where the first client render must equal what the server sent. Not detected
 * through `typeof document` alone: jsdom defines it and server tests run there.
 */
export function _isServerFirst(): boolean {
  if (typeof window === "undefined") return true;
  if (claimed) return false;
  claimed = true;
  return pageHasServerMarkup();
}

/** @internal Forgets that a root has claimed the page, so a test can hydrate again. */
export function _resetServerFirst(): void {
  claimed = false;
}
