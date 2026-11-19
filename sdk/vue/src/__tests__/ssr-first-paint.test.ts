import type { CookieYesConfig } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { CookieYes } from "../plugin.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { getCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, unmountAll } from "./test-utils.js";

/**
 * The banner must appear in server-rendered HTML (before any client script) with a deterministic,
 * documented selector, identically across modes.
 */
beforeEach(clearCookie);
afterEach(unmountAll);

async function serverHtml(config: CookieYesConfig): Promise<string> {
  const app = createSSRApp(CookieBanner);
  app.use(CookieYes, config);
  return renderToString(app);
}

describe("SSR first-byte paint", () => {
  it("renders the GDPR banner markup on the server", async () => {
    const html = await serverHtml(cookieOnly("GDPR"));
    expect(html).toContain("data-cky-banner");
    expect(html).toMatch(/class="[^"]*cy-banner[^"]*"/);
    expect(html).toContain('role="dialog"');
    expect(html).toContain("We value your privacy");
    expect(html).toContain("Accept All");
  });

  // A strict `style-src` policy blocks style attributes in server HTML, which once left the
  // announcer's text visible on the page.
  it("renders no inline style attribute, so a strict style-src policy needs no exception", async () => {
    for (const regulation of ["GDPR", "CCPA"] as const) {
      expect(await serverHtml(cookieOnly(regulation))).not.toContain("style=");
      resetCookieYes();
    }
  });

  it("renders the CCPA variant on the server", async () => {
    const html = await serverHtml(cookieOnly("CCPA"));
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("Do Not Sell");
  });

  it("server snapshot is a visible fresh-visitor state carrying the configured regulation", async () => {
    await serverHtml(cookieOnly("CCPA"));
    const ssr = getCookieYes().getServerSnapshot();
    expect(ssr.hasActed).toBe(false);
    expect(ssr.isPreferencesOpen).toBe(false);
    expect(ssr.isOptOutOpen).toBe(false);
    expect(ssr.regulation).toBe("CCPA");
  });

  it("server snapshot reflects a custom taxonomy's fresh-visitor category map", async () => {
    await serverHtml({
      mode: "cookie-only",
      regulation: "GDPR",
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });
    const ssr = getCookieYes().getServerSnapshot();
    // Right keys (not the built-in five), required on, rest off: matches the client's fresh
    // state, so no shape mismatch on hydration.
    expect(Object.keys(ssr.categories).sort()).toEqual(["essential", "marketing"]);
    expect(ssr.categories.essential).toBe(true);
    expect(ssr.categories.marketing).toBe(false);
  });

  it("server snapshot for CCPA + custom taxonomy is opt-out (all on)", async () => {
    await serverHtml({
      mode: "cookie-only",
      regulation: "CCPA",
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });
    const ssr = getCookieYes().getServerSnapshot();
    expect(ssr.categories.essential).toBe(true);
    expect(ssr.categories.marketing).toBe(true);
  });
});

describe("selector contract (public)", () => {
  it("exposes data-cky-banner + the .cy-banner / .cy-banner-wrap classes", async () => {
    const html = await serverHtml(cookieOnly("GDPR"));
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("cy-banner-wrap");
    expect(html).toContain("cy-banner");
  });

  it("produces identical canonical markup regardless of mode (cookie-only vs self-hosted)", async () => {
    const cookieOnlyHtml = await serverHtml(cookieOnly("GDPR"));
    resetCookieYes();
    clearCookie();
    // A self-hosted config with a backend URL must not change banner markup.
    const selfHosted = await serverHtml({
      mode: "self-hosted",
      backendURL: "https://b.example/c",
      regulation: "GDPR",
    });
    // Generated ids differ per server render only if the render order does; both start at zero.
    expect(selfHosted).toBe(cookieOnlyHtml);
  });
});
