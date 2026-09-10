import { afterEach, describe, expect, it } from "vitest";
import { _activateDeferredStylesheets, initCookieYes } from "../runtime.js";
import { clearCookie, teardown } from "./test-utils.js";

/**
 * The Next.js adapter's `<CookieYesStyles />` emits the full stylesheet as
 * `<link rel="stylesheet" media="print" data-cy-full>` so the browser fetches
 * it without blocking first paint. Something has to switch it on afterwards,
 * and that something is this runtime — not an inline `onload` handler, which
 * a strict `script-src` would block. These tests pin that contract from the
 * runtime's side; the adapter's tests pin the markup.
 */
function addLink(media: string, deferred = true): HTMLLinkElement {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "/cookieyes/styles.css?v=test";
  link.media = media;
  if (deferred) link.setAttribute("data-cy-full", "");
  document.head.appendChild(link);
  return link;
}

afterEach(() => {
  teardown();
  clearCookie();
  for (const l of document.head.querySelectorAll("link")) l.remove();
});

describe("_activateDeferredStylesheets", () => {
  it("switches a deferred SDK stylesheet from print to all", () => {
    const link = addLink("print");
    _activateDeferredStylesheets();
    expect(link.media).toBe("all");
  });

  it("leaves other print stylesheets alone", () => {
    const theirs = addLink("print", false);
    _activateDeferredStylesheets();
    expect(theirs.media).toBe("print");
  });

  it("is idempotent", () => {
    const link = addLink("print");
    _activateDeferredStylesheets();
    _activateDeferredStylesheets();
    expect(link.media).toBe("all");
  });

  it("runs as part of mounting the runtime", () => {
    const link = addLink("print");
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    expect(link.media).toBe("all");
  });

  it("is a no-op on a page without the component", () => {
    expect(() => _activateDeferredStylesheets()).not.toThrow();
    expect(document.head.querySelectorAll("link").length).toBe(0);
  });
});
