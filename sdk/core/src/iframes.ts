import { categoryLabel, warnUnknownEmbedCategory } from "./embed-category.js";
import type { ConsentManager, ConsentStore } from "./types.js";

/** Declared locally and checked as a literal so bundlers strip the warnings; see `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/**
 * Where the placeholder gets its text and language, and hears about changes:
 * core's `consentStore`, or the React runtime from `getCookieYes()`.
 */
export type IframeBlockerStore = Pick<
  ConsentStore,
  "translations" | "getCategoryText" | "categories" | "getLanguageInfo"
> & { subscribe: (listener: () => void) => () => void };

const BLOCKABLE_IFRAMES = "iframe[data-cy-category]";

const PLACEHOLDER_TEXT = {
  message:
    "This content is hosted by {provider}. Viewing it needs your consent to {category} cookies.",
  allow: "Allow {category} cookies",
  privacyPolicy: "{provider} privacy policy",
};

/** Name and privacy policy of providers recognised from the embed's address. */
const KNOWN_PROVIDERS: Record<string, [name: string, privacyUrl: string]> = {
  "youtube.com": ["YouTube", "https://policies.google.com/privacy"],
  "youtube-nocookie.com": ["YouTube", "https://policies.google.com/privacy"],
  "vimeo.com": ["Vimeo", "https://vimeo.com/privacy"],
};

/**
 * Load each `<iframe data-cy-src="…" data-cy-category="…">` only once its
 * category is consented to, and unload it again if that consent is withdrawn.
 *
 * The browser never fetches an address kept in `data-cy-src`, so nothing loads
 * before consent however late this runs. Only saved consent counts: flipping a
 * switch without saving loads nothing. `data-cy-src` stays on the iframe, which
 * is what lets it load again when consent is given back.
 *
 * While blocked, the iframe shows a placeholder at its own size: who hosts the
 * content, the category it needs, a button that allows that category, and the
 * provider's privacy policy. The provider is recognised for YouTube and Vimeo,
 * or set with `data-cy-provider` and `data-cy-privacy-url`.
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
export function blockIframes(
  consentManager: ConsentManager,
  consentStore: IframeBlockerStore,
): () => void {
  if (typeof document === "undefined") return () => undefined;

  const allowCategory = (category: string) => {
    const granted = consentManager.committedCategories;
    consentManager.acceptSelected([...Object.keys(granted).filter((id) => granted[id]), category]);
  };

  /** Draws the placeholder into the iframe's `srcdoc` document, once it is reachable. */
  const fillPlaceholder = (iframe: HTMLIFrameElement) => {
    const doc = iframe.hasAttribute("srcdoc") ? iframe.contentDocument : null;
    if (!doc?.body) return;
    const category = iframe.dataset.cyCategory ?? "";
    const translations = consentStore.translations;
    const text = translations.embedPlaceholder ?? PLACEHOLDER_TEXT;
    const provider = providerOf(iframe);
    const label = categoryLabel(
      category,
      translations,
      consentStore.categories,
      consentStore.getCategoryText(category),
    );
    const fill = (template: string) =>
      template.replace("{provider}", provider.name).replace("{category}", label);

    const { language, direction } = consentStore.getLanguageInfo();
    doc.documentElement.lang = language;
    doc.documentElement.dir = direction;
    doc.body.style.cssText =
      "margin:0;height:100vh;box-sizing:border-box;padding:16px;display:flex;" +
      "flex-direction:column;align-items:center;justify-content:center;gap:12px;" +
      "text-align:center;font:14px/1.5 system-ui,sans-serif;background:#f2f2f2;color:#222";

    const message = doc.createElement("p");
    message.style.cssText = "margin:0;max-width:40em";
    message.textContent = fill(text.message);

    const allowButton = doc.createElement("button");
    allowButton.type = "button";
    allowButton.style.cssText =
      "font:inherit;padding:8px 16px;border:0;border-radius:4px;background:#222;color:#fff;cursor:pointer";
    allowButton.textContent = fill(text.allow);
    allowButton.onclick = () => allowCategory(category);

    doc.body.replaceChildren(message, allowButton);

    if (provider.privacyUrl) {
      const privacyLink = doc.createElement("a");
      privacyLink.href = provider.privacyUrl;
      privacyLink.target = "_blank";
      privacyLink.rel = "noopener";
      privacyLink.style.color = "inherit";
      privacyLink.textContent = fill(text.privacyPolicy);
      privacyLink.setAttribute(
        "aria-label",
        `${privacyLink.textContent} (${translations.opensInNewTab})`,
      );
      doc.body.append(privacyLink);
    }
  };

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
    if (!(category in granted)) warnUnknownEmbedCategory(category);
    if (granted[category] === true) {
      if (iframe.getAttribute("src") === src) return;
      iframe.removeAttribute("srcdoc");
      iframe.setAttribute("src", src);
    } else {
      iframe.removeAttribute("src");
      if (!iframe.hasAttribute("srcdoc")) iframe.setAttribute("srcdoc", "");
      fillPlaceholder(iframe);
    }
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

  // An iframe's `load` does not bubble, but a capturing listener still sees it.
  const onFrameLoad = (event: Event) => {
    if (event.target instanceof HTMLIFrameElement && event.target.matches(BLOCKABLE_IFRAMES)) {
      fillPlaceholder(event.target);
    }
  };
  document.addEventListener("load", onFrameLoad, true);

  gateWithin(document);
  const unsubscribe = consentStore.subscribe(() => gateWithin(document));

  return () => {
    unsubscribe();
    observer.disconnect();
    document.removeEventListener("load", onFrameLoad, true);
  };
}

function providerOf(iframe: HTMLIFrameElement): { name: string; privacyUrl: string | undefined } {
  const address = document.createElement("a");
  address.href = iframe.dataset.cySrc ?? "";
  const host = address.hostname.replace(/^www\./, "");
  const known = KNOWN_PROVIDERS[host.split(".").slice(-2).join(".")];
  return {
    name: iframe.dataset.cyProvider ?? known?.[0] ?? host,
    privacyUrl: iframe.dataset.cyPrivacyUrl ?? known?.[1],
  };
}

function warnUnparkedSrc(src: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[cookieyes] the iframe ${src} has data-cy-category but a plain src, so the browser ` +
      "started loading it before consent. Put the address in data-cy-src instead.",
  );
}
