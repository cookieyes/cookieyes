import type { ConsentManager } from "./types.js";

/** Declared locally and checked as a literal so bundlers strip the warnings; see `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

const BLOCKABLE_IFRAMES = "iframe[data-cy-category]";

/**
 * Load each `<iframe data-cy-src="…" data-cy-category="…">` only once its
 * category is consented to, and unload it again if that consent is withdrawn.
 *
 * The browser never fetches an address kept in `data-cy-src`, so nothing loads
 * before consent however late this runs. Only saved consent counts: flipping a
 * switch without saving loads nothing. `data-cy-src` stays on the iframe, which
 * is what lets it load again when consent is given back.
 *
 * Iframes added later, or whose `data-cy-*` attributes change, are handled too.
 * An iframe marked with `data-cy-category` but given a plain `src` has already
 * started loading; its address is moved to `data-cy-src` so the rest of that
 * load stops until consent. In development, that and an unknown category log a
 * warning.
 *
 * Lives at `@cookieyes/core/iframes`, so sites that do not use it do not
 * download it.
 *
 * @returns A function that stops watching the page and consent. Iframes keep their state.
 */
export function blockIframes(consentManager: ConsentManager): () => void {
  if (typeof document === "undefined") return () => undefined;

  const warnedCategories = new Set<string>();

  const gateIframe = (iframe: HTMLIFrameElement) => {
    const category = iframe.dataset.cyCategory ?? "";
    let src = iframe.dataset.cySrc;
    if (!src) {
      src = iframe.getAttribute("src") ?? "";
      if (!src) return;
      iframe.dataset.cySrc = src;
      warnUnparkedSrc(src);
    }
    const granted = consentManager.committedCategories;
    if (!(category in granted) && !warnedCategories.has(category)) {
      warnedCategories.add(category);
      warnUnknownCategory(category);
    }
    const allowed = granted[category] === true;
    const loaded = iframe.getAttribute("src") === src;
    if (allowed && !loaded) iframe.setAttribute("src", src);
    else if (!allowed && loaded) iframe.removeAttribute("src");
  };

  const gateWithin = (root: Document | Element) => {
    if (root instanceof HTMLIFrameElement && root.matches(BLOCKABLE_IFRAMES)) gateIframe(root);
    for (const iframe of root.querySelectorAll<HTMLIFrameElement>(BLOCKABLE_IFRAMES)) {
      gateIframe(iframe);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "attributes") gateWithin(mutation.target as Element);
      for (const node of mutation.addedNodes) if (node instanceof Element) gateWithin(node);
    }
  });
  observer.observe(document, {
    subtree: true,
    childList: true,
    attributeFilter: ["data-cy-src", "data-cy-category"],
  });

  gateWithin(document);
  const unsubscribe = consentManager.subscribe(() => gateWithin(document));

  return () => {
    unsubscribe();
    observer.disconnect();
  };
}

function warnUnparkedSrc(src: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[cookieyes] the iframe ${src} has data-cy-category but a plain src, so the browser ` +
      "started loading it before consent. Put the address in data-cy-src instead.",
  );
}

function warnUnknownCategory(category: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[cookieyes] data-cy-category="${category}" is not one of your configured categories, ` +
      "so these iframes will never load. Use an id from your categories.",
  );
}
