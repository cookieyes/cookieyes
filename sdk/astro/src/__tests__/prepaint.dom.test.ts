// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _WAIT_CSS } from "../styles.js";

const globals = globalThis as { __CY_TAX__?: string; __CY_DEFAULT__?: boolean };

beforeEach(() => {
  vi.resetModules();
  globals.__CY_TAX__ = "2fbx48";
  globals.__CY_DEFAULT__ = true;
  document.documentElement.removeAttribute("data-cy-banner");
});

afterEach(() => {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  delete globals.__CY_TAX__;
  delete globals.__CY_DEFAULT__;
});

describe("the head script", () => {
  it("reveals the banner shell for a visitor with no decision", async () => {
    await import("../prepaint/script.js");
    expect(document.documentElement.getAttribute("data-cy-banner")).toBe("show");
  });

  it("leaves it hidden for a visitor whose decision the runtime will honour", async () => {
    document.cookie = "cookieyes-consent=action:yes,tax:2fbx48; path=/";
    await import("../prepaint/script.js");
    expect(document.documentElement.hasAttribute("data-cy-banner")).toBe(false);
  });
});

describe("_WAIT_CSS", () => {
  it("hides only the waiting shell, and only until the head script reveals it", () => {
    const style = document.createElement("style");
    style.textContent = _WAIT_CSS;
    document.head.appendChild(style);
    document.body.innerHTML = '<div id="wait" data-cy-wait></div><div id="other"></div>';
    const display = (id: string) =>
      getComputedStyle(document.getElementById(id) as Element).display;
    expect(display("wait")).toBe("none");
    expect(display("other")).toBe("block");
    document.documentElement.setAttribute("data-cy-banner", "show");
    expect(display("wait")).toBe("block");
    style.remove();
  });
});
