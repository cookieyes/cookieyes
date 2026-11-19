// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import { CookieYes } from "../plugin.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { resetCookieYes } from "../runtime.js";

afterEach(resetCookieYes);

describe("server rendering without a DOM", () => {
  it("renders the banner where there is no document or window", async () => {
    expect(typeof document).toBe("undefined");
    expect(typeof window).toBe("undefined");
    const app = createSSRApp(CookieBanner);
    app.use(CookieYes, { mode: "cookie-only", regulation: "GDPR" });
    const html = await renderToString(app);
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("Accept All");
  });
});
