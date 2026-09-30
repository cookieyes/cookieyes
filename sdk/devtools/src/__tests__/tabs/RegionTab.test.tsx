import { initCookieYes } from "@cookieyes/react";
import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../../devtools.js";
import { clearCookie, teardown } from "../test-utils.js";

/** Declared locally — see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

beforeEach(() => {
  clearCookie();
  process.env.NODE_ENV = "development";
});
afterEach(() => {
  cleanup();
  teardown();
});

async function openTab(tab: string, props?: Parameters<typeof CookieYesDevtools>[0]) {
  const user = userEvent.setup();
  render(<CookieYesDevtools {...props} />);
  await user.click(document.querySelector('[data-cyd-part="trigger"]') as HTMLElement);
  await user.click(document.querySelector(`[data-cyd-part="tab-${tab}"]`) as HTMLElement);
  return user;
}

describe("RegionTab", () => {
  // Test 20 (design §9)
  it("shows the real decision when unforced", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR" } },
    });
    await openTab("region");
    expect(document.querySelector('[data-cyd-part="region-source"]')?.textContent).toBe("detected");
  });

  // Test 21 (design §9) — Story 3.5: "clear which header or signal drove the
  // real decision". Without a `serverRegion` prop (a plain client-only app,
  // or a Next.js app that hasn't wired getServerRegion() in yet), the tab
  // discloses that the signal was determined client-side rather than leaving
  // the row blank.
  it("shows a client-determined fallback when no serverRegion prop is passed", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR" } },
    });
    await openTab("region");
    expect(document.querySelector('[data-cyd-part="region-driving-signal"]')?.textContent).toBe(
      "determined in the browser: detected",
    );
  });

  // Test 21 (design §9) — with a `serverRegion` prop (what
  // `<CookieYesDevtools serverRegion={await getServerRegion()} />` passes),
  // the actual header + value that drove the decision is shown.
  it("shows the header and value from a passed serverRegion prop", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR" } },
    });
    await openTab("region", {
      serverRegion: {
        region: "GB",
        drivingSignal: { header: "x-vercel-ip-country", value: "GB" },
        gpc: false,
        forcedRegion: undefined,
      },
    });
    expect(document.querySelector('[data-cyd-part="region-driving-signal"]')?.textContent).toBe(
      "x-vercel-ip-country=GB",
    );
  });

  it("hides the driving-signal row while a forced override is active", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.type(
      document.querySelector('[data-cyd-part="region-force-input"]') as HTMLElement,
      "US-CA",
    );
    await user.click(
      document.querySelector('[data-cyd-part="region-force-submit"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-driving-signal"]')).toBeNull();
  });

  // Test 22 (design §9)
  it("setting a forced region shows the warning banner", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.type(
      document.querySelector('[data-cyd-part="region-force-input"]') as HTMLElement,
      "US-CA",
    );
    await user.click(
      document.querySelector('[data-cyd-part="region-force-submit"]') as HTMLElement,
    );
    const banner = document.querySelector('[data-cyd-part="region-forced-warning"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("would differ in production");
  });

  // Test 23 (design §9)
  it("flows the forced region into the displayed source", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.type(
      document.querySelector('[data-cyd-part="region-force-input"]') as HTMLElement,
      "US-CA",
    );
    await user.click(
      document.querySelector('[data-cyd-part="region-force-submit"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-source"]')?.textContent).toBe("forced");
  });

  it("previews a forced region with the SDK's own mapping", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR", "US-CA": "CCPA" } },
    });
    const user = await openTab("region");
    await user.type(
      document.querySelector('[data-cyd-part="region-force-input"]') as HTMLElement,
      "US-CA",
    );
    await user.click(
      document.querySelector('[data-cyd-part="region-force-submit"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-source"]')?.textContent).toBe("forced");
    expect(document.querySelector('[data-cyd-part="region-tab"]')?.textContent).toContain("CCPA");
  });

  it("says the override has no effect when the regulation is pinned manually", async () => {
    initCookieYes({
      mode: "cookie-only",
      regulation: "GDPR",
      region: { map: { DE: "GDPR", "US-CA": "CCPA" } },
    });
    const user = await openTab("region");
    await user.type(
      document.querySelector('[data-cyd-part="region-force-input"]') as HTMLElement,
      "US-CA",
    );
    await user.click(
      document.querySelector('[data-cyd-part="region-force-submit"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-forced-warning"]')).toBeNull();
    expect(
      document.querySelector('[data-cyd-part="region-forced-ignored"]')?.textContent,
    ).toContain("has no effect");
    expect(document.querySelector('[data-cyd-part="region-source"]')?.textContent).toBe("manual");
  });

  // Test 24 (design §9)
  it("clearing the override removes the warning", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.type(
      document.querySelector('[data-cyd-part="region-force-input"]') as HTMLElement,
      "US-CA",
    );
    await user.click(
      document.querySelector('[data-cyd-part="region-force-submit"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-forced-warning"]')).not.toBeNull();
    await user.click(
      document.querySelector('[data-cyd-part="region-clear-override"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-forced-warning"]')).toBeNull();
  });
});
