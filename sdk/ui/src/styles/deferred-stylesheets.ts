/**
 * Switch any deferred SDK stylesheet — `<link rel="stylesheet" media="print"
 * data-cy-full>` — to `media="all"`. The `print` media is how it was fetched
 * without blocking first paint; by the time a banner mounts, first paint is
 * long past, so applying it costs nothing. If the sheet has not finished
 * downloading yet, flipping `media` early is still correct: the browser applies
 * it on arrival, and does not re-block rendering for a stylesheet that was not
 * in the initial parse.
 *
 * Doing this from code that already ships, rather than with an inline `onload`
 * handler, is what keeps the page free of inline script, so a strict
 * `script-src` needs no exception for it.
 *
 * SSR-safe, idempotent, and a no-op on a page with no deferred sheet.
 */
export function activateDeferredStylesheets(): void {
  if (typeof document === "undefined") return;
  for (const link of document.querySelectorAll<HTMLLinkElement>("link[data-cy-full]")) {
    if (link.media !== "all") link.media = "all";
  }
}
