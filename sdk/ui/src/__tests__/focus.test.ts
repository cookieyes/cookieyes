// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  bodyPortalRoot,
  closeOnEscape,
  focusDialog,
  focusRecallAfterBanner,
  rememberOpener,
  trapFocus,
} from "../behaviour/focus.js";

function press(key: string, shiftKey = false): KeyboardEvent {
  const e = new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true });
  document.dispatchEvent(e);
  return e;
}

function dialog(html: string): HTMLElement {
  const el = document.createElement("div");
  el.tabIndex = -1;
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("trapFocus", () => {
  const html = "<button id=a>a</button><input id=b><a id=c href=#>c</a>";

  it("pulls focus from the page into the dialog, forwards and backwards", () => {
    const root = dialog(html);
    const release = trapFocus(() => root);
    press("Tab");
    expect(document.activeElement?.id).toBe("a");
    (document.activeElement as HTMLElement).blur();
    press("Tab", true);
    expect(document.activeElement?.id).toBe("c");
    release();
  });

  it("wraps at both ends and leaves the middle to the browser", () => {
    const root = dialog(html);
    const release = trapFocus(() => root);
    root.querySelector<HTMLElement>("#c")?.focus();
    expect(press("Tab").defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("a");
    expect(press("Tab", true).defaultPrevented).toBe(true);
    expect(document.activeElement?.id).toBe("c");
    root.querySelector<HTMLElement>("#b")?.focus();
    expect(press("Tab").defaultPrevented).toBe(false);
    release();
  });

  it("treats focus on the dialog itself as outside, and stops after the cleanup", () => {
    const root = dialog(html);
    const release = trapFocus(() => root);
    root.focus();
    press("Tab");
    expect(document.activeElement?.id).toBe("a");
    release();
    root.querySelector<HTMLElement>("#c")?.focus();
    expect(press("Tab").defaultPrevented).toBe(false);
  });

  it("ignores other keys, a missing container and a container with nothing to focus", () => {
    const empty = dialog("<p>text</p>");
    const releaseEmpty = trapFocus(() => empty);
    const releaseMissing = trapFocus(() => null);
    expect(press("Tab").defaultPrevented).toBe(false);
    expect(press("Enter").defaultPrevented).toBe(false);
    releaseEmpty();
    releaseMissing();
  });
});

describe("closeOnEscape", () => {
  it("calls back on Escape only, until the cleanup", () => {
    const onEscape = vi.fn();
    const release = closeOnEscape(onEscape);
    press("Enter");
    press("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
    release();
    press("Escape");
    expect(onEscape).toHaveBeenCalledTimes(1);
  });
});

describe("focusDialog", () => {
  it("focuses the dialog and returns focus to the opener on cleanup", () => {
    const opener = document.createElement("button");
    document.body.appendChild(opener);
    opener.focus();
    rememberOpener();
    const root = dialog("<button>x</button>");
    const restore = focusDialog(root);
    expect(document.activeElement).toBe(root);
    restore();
    expect(document.activeElement).toBe(opener);
  });

  it("finds a replaced opener by its text when the original left the page", () => {
    const banner = document.createElement("div");
    banner.setAttribute("data-cky-banner", "");
    banner.innerHTML = "<button>Close</button><button>Do Not Sell</button>";
    document.body.appendChild(banner);
    banner.querySelectorAll("button")[1]?.focus();
    rememberOpener();
    banner.remove();
    const restore = focusDialog(dialog(""));
    const again = banner.cloneNode(true) as HTMLElement;
    document.body.appendChild(again);
    restore();
    expect(document.activeElement?.textContent).toBe("Do Not Sell");
  });

  it("falls back to the first control when no opener was remembered", () => {
    document.body.innerHTML = '<button class="cy-widget">recall</button>';
    focusDialog(null)();
    expect(document.activeElement?.className).toBe("cy-widget");
  });
});

describe("focusRecallAfterBanner", () => {
  it("moves focus to the recall button only when focus fell to the page", () => {
    document.body.innerHTML = '<button class="cy-widget">r</button><button id=other>o</button>';
    focusRecallAfterBanner();
    expect(document.activeElement?.className).toBe("cy-widget");
    document.getElementById("other")?.focus();
    focusRecallAfterBanner();
    expect(document.activeElement?.id).toBe("other");
  });
});

describe("bodyPortalRoot", () => {
  it("creates one element at the start of the body and reuses it", () => {
    document.body.innerHTML = "<main></main>";
    const root = bodyPortalRoot();
    expect(document.body.firstChild).toBe(root);
    expect(bodyPortalRoot()).toBe(root);
  });
});
