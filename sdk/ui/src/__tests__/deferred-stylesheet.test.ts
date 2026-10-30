// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { activateDeferredStylesheets } from "../styles/deferred-stylesheets.js";

/**
 * The Next.js adapter's `<CookieYesStyles />` emits the full stylesheet as
 * `<link rel="stylesheet" media="print" data-cy-full>` so the browser fetches
 * it without blocking first paint. Something has to switch it on afterwards,
 * and that something is every banner's mount, not an inline `onload` handler,
 * which a strict `script-src` would block. These tests pin that contract; each
 * adapter's tests pin that its mount calls it, and the Next.js tests pin the markup.
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
  for (const l of document.head.querySelectorAll("link")) l.remove();
});

describe("activateDeferredStylesheets", () => {
  it("switches a deferred SDK stylesheet from print to all", () => {
    const link = addLink("print");
    activateDeferredStylesheets();
    expect(link.media).toBe("all");
  });

  it("leaves other print stylesheets alone", () => {
    const theirs = addLink("print", false);
    activateDeferredStylesheets();
    expect(theirs.media).toBe("print");
  });

  it("is idempotent", () => {
    const link = addLink("print");
    activateDeferredStylesheets();
    activateDeferredStylesheets();
    expect(link.media).toBe("all");
  });

  it("is a no-op on a page without the component", () => {
    expect(() => activateDeferredStylesheets()).not.toThrow();
    expect(document.head.querySelectorAll("link").length).toBe(0);
  });
});
