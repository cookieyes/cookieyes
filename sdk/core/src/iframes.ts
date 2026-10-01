import type { ConsentManager } from "./types.js";

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
 * Lives at `@cookieyes/core/iframes`, so sites that do not use it do not
 * download it.
 *
 * @returns A function that stops watching consent. Iframes keep their state.
 */
export function blockIframes(consentManager: ConsentManager): () => void {
  if (typeof document === "undefined") return () => undefined;

  const applyConsent = () => {
    const granted = consentManager.committedCategories;
    for (const iframe of document.querySelectorAll<HTMLIFrameElement>(BLOCKABLE_IFRAMES)) {
      const src = iframe.dataset.cySrc;
      if (!src) continue;
      const allowed = granted[iframe.dataset.cyCategory ?? ""] === true;
      const loaded = iframe.getAttribute("src") === src;
      if (allowed && !loaded) iframe.setAttribute("src", src);
      else if (!allowed && loaded) iframe.removeAttribute("src");
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyConsent, { once: true });
  } else {
    applyConsent();
  }
  const unsubscribe = consentManager.subscribe(applyConsent);

  return () => {
    unsubscribe();
    document.removeEventListener("DOMContentLoaded", applyConsent);
  };
}
