// @vitest-environment jsdom
import { _clearScriptRegistry, initCookieYes, resetConsentRuntime } from "@cookieyes/core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { _scanGated } from "../client/gated.js";

const CONFIG = { mode: "cookie-only", regulation: "GDPR" } as const;

function frame(category = "analytics", attrs: Record<string, string> = { title: "Map" }): string {
  const data = JSON.stringify({ src: "https://maps.example/", attrs }).replace(/"/g, "&quot;");
  return `<div class="cy-frame-placeholder" data-cy-gated-frame data-category="${category}" data-frame="${data}"><p>Needs <strong>x</strong></p><button data-cy-gated-open>Manage</button></div>`;
}

afterEach(() => {
  resetConsentRuntime();
  _clearScriptRegistry();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("_scanGated", () => {
  it("registers each gated script once with core", () => {
    const runtime = initCookieYes(CONFIG);
    const register = vi.spyOn(runtime.consentManager, "registerScript");
    document.body.innerHTML =
      '<template data-cy-gated-script data-id="a" data-src="/a.js" data-category="analytics"></template>';
    _scanGated(runtime, CONFIG, () => undefined);
    _scanGated(runtime, CONFIG, () => undefined);
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({ id: "a", src: "/a.js", category: "analytics" });
  });

  it("swaps a frame's placeholder for the iframe on grant, and back on withdrawal", () => {
    const runtime = initCookieYes(CONFIG);
    const open = vi.fn();
    document.body.innerHTML = frame();
    _scanGated(runtime, CONFIG, open);
    expect(document.querySelector("strong")?.textContent).toBe("Analytics");
    (document.querySelector("[data-cy-gated-open]") as HTMLElement).click();
    expect(open).toHaveBeenCalled();
    expect(document.querySelector("iframe")).toBeNull();
    runtime.consentManager.acceptAll();
    const iframe = document.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe("https://maps.example/");
    expect(iframe?.getAttribute("title")).toBe("Map");
    runtime.consentManager.rejectAll();
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector("[data-cy-gated-frame]")).not.toBeNull();
  });

  it("warns about a category outside the taxonomy, and stops following frames that left the page", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const runtime = initCookieYes(CONFIG);
    document.body.innerHTML = frame("nope");
    _scanGated(runtime, CONFIG, () => undefined);
    expect(warn).toHaveBeenCalled();
    document.body.innerHTML = "";
    _scanGated(runtime, CONFIG, () => undefined);
    expect(() => runtime.consentManager.acceptAll()).not.toThrow();
  });

  it("applies a frame's style through the CSSOM, which a strict style-src allows", () => {
    const runtime = initCookieYes(CONFIG);
    document.body.innerHTML = frame("analytics", { title: "Map", style: "border: 0; width: 10px" });
    const setAttribute = vi.spyOn(HTMLIFrameElement.prototype, "setAttribute");
    _scanGated(runtime, CONFIG, () => undefined);
    runtime.consentManager.acceptAll();
    const iframe = document.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe.style.width).toBe("10px");
    expect(iframe.getAttribute("title")).toBe("Map");
    expect(setAttribute.mock.calls.map(([name]) => name)).not.toContain("style");
  });
});
