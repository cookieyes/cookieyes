import { describe, expect, it } from "vitest";
import { renderOnServer, useServerRenderer } from "./ssr-render.js";

/**
 * The banner must appear in server-rendered HTML (before any client script) with a deterministic,
 * documented selector, identically across modes.
 */
useServerRenderer();

describe("SSR first-byte paint", () => {
  it("renders the GDPR banner markup on the server", async () => {
    const { body } = await renderOnServer({ parts: ["banner"], regulation: "GDPR" });
    expect(body).toContain("data-cky-banner");
    expect(body).toMatch(/class="[^"]*cy-banner[^"]*"/);
    expect(body).toContain('role="dialog"');
    expect(body).toContain("We value your privacy");
    expect(body).toContain("Accept All");
  });

  // A strict `style-src` policy blocks style attributes in server HTML, which once left the
  // announcer's text visible on the page.
  it("renders no inline style attribute, so a strict style-src policy needs no exception", async () => {
    for (const regulation of ["GDPR", "CCPA"] as const) {
      const { body } = await renderOnServer({ parts: ["banner"], regulation });
      expect(body).not.toContain("style=");
    }
  });

  it("renders the CCPA variant on the server", async () => {
    const { body } = await renderOnServer({ parts: ["banner"], regulation: "CCPA" });
    expect(body).toContain("data-cky-banner");
    expect(body).toContain("Do Not Sell");
    expect(body).toContain("cy-banner-footer--ccpa");
  });

  it("renders the CCPA variant for a region that maps to CCPA", async () => {
    const { body } = await renderOnServer({ parts: ["banner"], region: "US-CA" });
    expect(body).toContain("Do Not Sell");
  });

  it("falls back to the strictest regulation for an unknown region", async () => {
    const { body } = await renderOnServer({ parts: ["banner"], region: "JP" });
    expect(body).toContain("Accept All");
    expect(body).not.toContain("Do Not Sell");
  });

  it("exposes data-cky-banner and the .cy-banner and .cy-banner-wrap classes", async () => {
    const { body } = await renderOnServer({ parts: ["banner"], regulation: "GDPR" });
    expect(body).toContain("data-cky-banner");
    expect(body).toContain("cy-banner-wrap");
    expect(body).toContain("cy-banner");
  });

  it("writes the dialog, its title and its heading id on the server, matching each other", async () => {
    const { body } = await renderOnServer({ parts: ["banner"], regulation: "GDPR" });
    const labelledby = /aria-labelledby="([^"]+)"/.exec(body)?.[1];
    expect(labelledby).toBeTruthy();
    expect(body).toContain(`id="${labelledby}"`);
  });
});
