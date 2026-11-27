import { activateDeferredStylesheets } from "@cookieyes/ui";

/**
 * Elements `@cookieyes/vanilla` appends to `<body>` rather than to the portal root: the dialogs and
 * the reload notice. The class names are vanilla's, pinned by `router.test.ts`.
 */
const BODY_LEVEL = ".cy-dialog-overlay, .cy-reload-notice";

/**
 * @internal Keeps the consent UI across `<ClientRouter />` navigations. The portal root is
 * carried by `transition:persist`; this carries what lives outside it, and the attribute the head
 * script set on `<html>`, which Astro replaces with the new page's. Listens to the event names as
 * strings, because Astro 7 removed the constants. Without the router none of these events fire.
 */
export function _installRouter(onPageLoad: () => void): () => void {
  const beforeSwap = (event: Event) => {
    const next = (event as Event & { newDocument?: Document }).newDocument;
    if (!next) return;
    // Moved, not copied: the element keeps its listeners and its focus trap.
    for (const el of Array.from(document.body.children)) {
      if (el.matches(BODY_LEVEL)) next.body.appendChild(el);
    }
    const banner = document.documentElement.getAttribute("data-cy-banner");
    if (banner !== null) next.documentElement.setAttribute("data-cy-banner", banner);
  };
  // A new page's link to the stylesheet is the same URL, which Astro keeps; this covers a page
  // whose link differs, so it does not stay on `media="print"`.
  const afterSwap = () => activateDeferredStylesheets();
  document.addEventListener("astro:before-swap", beforeSwap);
  document.addEventListener("astro:after-swap", afterSwap);
  document.addEventListener("astro:page-load", onPageLoad);
  return () => {
    document.removeEventListener("astro:before-swap", beforeSwap);
    document.removeEventListener("astro:after-swap", afterSwap);
    document.removeEventListener("astro:page-load", onPageLoad);
  };
}
