// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { _installRouter } from "../client/router.js";

let uninstall: (() => void) | undefined;
afterEach(() => {
  uninstall?.();
  document.body.innerHTML = "";
  document.documentElement.removeAttribute("data-cy-banner");
});

function swap(): Document {
  const next = document.implementation.createHTMLDocument("next");
  const event = Object.assign(new Event("astro:before-swap"), { newDocument: next });
  document.dispatchEvent(event);
  return next;
}

describe("_installRouter", () => {
  it("carries vanilla's body-level dialogs and notice into the new page, listeners and all", () => {
    uninstall = _installRouter(() => undefined);
    // The class names vanilla gives the elements it appends to <body>.
    document.body.innerHTML =
      '<div class="cy-dialog-overlay"></div><div class="cy-reload-notice"></div><main></main>';
    const dialog = document.querySelector(".cy-dialog-overlay") as HTMLElement;
    const clicked = vi.fn();
    dialog.addEventListener("click", clicked);
    const next = swap();
    expect(next.body.querySelector(".cy-dialog-overlay")).toBe(dialog);
    expect(next.body.querySelector(".cy-reload-notice")).not.toBeNull();
    expect(document.querySelector("main")).not.toBeNull();
    dialog.click();
    expect(clicked).toHaveBeenCalled();
  });

  it("copies the head script's verdict onto the new page's <html>", () => {
    uninstall = _installRouter(() => undefined);
    document.documentElement.setAttribute("data-cy-banner", "show");
    expect(swap().documentElement.getAttribute("data-cy-banner")).toBe("show");
    document.documentElement.removeAttribute("data-cy-banner");
    expect(swap().documentElement.hasAttribute("data-cy-banner")).toBe(false);
  });

  it("ignores a swap event without a new document", () => {
    uninstall = _installRouter(() => undefined);
    expect(() => document.dispatchEvent(new Event("astro:before-swap"))).not.toThrow();
  });

  it("switches the stylesheet on after a swap and calls back on every page load", () => {
    const onPageLoad = vi.fn();
    uninstall = _installRouter(onPageLoad);
    document.head.innerHTML = '<link rel="stylesheet" href="/s.css" media="print" data-cy-full>';
    document.dispatchEvent(new Event("astro:after-swap"));
    expect(document.querySelector("link")?.media).toBe("all");
    document.dispatchEvent(new Event("astro:page-load"));
    expect(onPageLoad).toHaveBeenCalledTimes(1);
    uninstall();
    uninstall = undefined;
    document.dispatchEvent(new Event("astro:page-load"));
    expect(onPageLoad).toHaveBeenCalledTimes(1);
  });
});
