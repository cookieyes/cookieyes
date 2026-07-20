import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { createCookieYes } from "../runtime.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

/**
 * FIX 2 / FIX 3 — server-rendered banner (first-byte paint) + stable selector contract.
 * The banner must appear in server-rendered HTML (before any client JS) with a
 * deterministic, documented selector, identically across modes.
 */
beforeEach(clearCookie);
afterEach(teardown);

describe("SSR first-byte paint", () => {
  it("renders the GDPR banner markup on the server", () => {
    mountOffline("GDPR");
    const html = renderToStaticMarkup(<CookieBanner />);
    expect(html).toContain("data-cky-banner");
    expect(html).toMatch(/class="[^"]*cy-banner[^"]*"/);
    expect(html).toContain('role="dialog"');
    expect(html).toContain("We value your privacy"); // banner title is in the HTML
    expect(html).toContain("Accept All");
  });

  it("renders the CCPA variant on the server", () => {
    mountOffline("CCPA");
    const html = renderToStaticMarkup(<CookieBanner />);
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("Do Not Sell"); // CCPA opt-out action present in SSR output
  });

  it("server snapshot is a visible fresh-visitor state carrying the configured regulation", () => {
    const rt = mountOffline("CCPA");
    const ssr = rt.getServerSnapshot();
    expect(ssr.hasActed).toBe(false);
    expect(ssr.isPreferencesOpen).toBe(false);
    expect(ssr.isOptOutOpen).toBe(false);
    expect(ssr.regulation).toBe("CCPA");
  });

  it("server snapshot reflects a custom taxonomy's fresh-visitor category map", () => {
    const rt = createCookieYes()
      .mode("cookie-only")
      .regulation("GDPR")
      .categories([{ id: "essential", required: true }, { id: "marketing" }])
      .mount();
    const ssr = rt.getServerSnapshot();
    // Right keys (not the built-in five), required on, rest off — matches the
    // client's fresh state, so no shape mismatch on hydration.
    expect(Object.keys(ssr.categories).sort()).toEqual(["essential", "marketing"]);
    expect(ssr.categories.essential).toBe(true);
    expect(ssr.categories.marketing).toBe(false);
  });

  it("server snapshot for CCPA + custom taxonomy is opt-out (all on)", () => {
    const rt = createCookieYes()
      .mode("cookie-only")
      .regulation("CCPA")
      .categories([{ id: "essential", required: true }, { id: "marketing" }])
      .mount();
    const ssr = rt.getServerSnapshot();
    expect(ssr.categories.essential).toBe(true);
    expect(ssr.categories.marketing).toBe(true);
  });
});

describe("selector contract (public)", () => {
  it("exposes data-cky-banner + the .cy-banner / .cy-banner-wrap classes", () => {
    mountOffline("GDPR");
    const html = renderToStaticMarkup(<CookieBanner />);
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("cy-banner-wrap");
    expect(html).toContain("cy-banner");
  });

  it("produces identical canonical markup regardless of mode (offline vs self-hosted)", () => {
    const offline = (() => {
      mountOffline("GDPR");
      const h = renderToStaticMarkup(<CookieBanner />);
      teardown();
      return h;
    })();
    clearCookie();
    // self-hosted with a backend URL must not change banner markup
    createCookieYes()
      .mode("self-hosted")
      .backendURL("https://b.example/c")
      .regulation("GDPR")
      .mount();
    const selfHosted = renderToStaticMarkup(<CookieBanner />);
    expect(selfHosted).toBe(offline);
  });
});
