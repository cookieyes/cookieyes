import { initCookieYes } from "@cookieyes/react";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

/** Pick a region through the combobox: open it, search, press Enter. */
async function forceRegion(user: ReturnType<typeof userEvent.setup>, query: string) {
  await user.click(part("region-force-trigger"));
  await user.type(part("region-force-search"), `${query}{Enter}`);
}

function part(name: string): HTMLElement {
  return document.querySelector(`[data-cyd-part="${name}"]`) as HTMLElement;
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
    await forceRegion(user, "US-CA");
    expect(document.querySelector('[data-cyd-part="region-driving-signal"]')).toBeNull();
  });

  // Test 22 (design §9)
  it("setting a forced region shows the warning banner", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await forceRegion(user, "US-CA");
    const banner = document.querySelector('[data-cyd-part="region-forced-warning"]');
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain("would differ in production");
  });

  // Test 23 (design §9)
  it("flows the forced region into the displayed source", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await forceRegion(user, "US-CA");
    expect(document.querySelector('[data-cyd-part="region-source"]')?.textContent).toBe("forced");
  });

  it("previews a forced region with the SDK's own mapping", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR", "US-CA": "CCPA" } },
    });
    const user = await openTab("region");
    await forceRegion(user, "US-CA");
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
    await forceRegion(user, "US-CA");
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
    await forceRegion(user, "US-CA");
    expect(document.querySelector('[data-cyd-part="region-forced-warning"]')).not.toBeNull();
    await user.click(
      document.querySelector('[data-cyd-part="region-clear-override"]') as HTMLElement,
    );
    expect(document.querySelector('[data-cyd-part="region-forced-warning"]')).toBeNull();
  });

  it("lists mapped regions first, each with the regulation it resolves to", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR", "US-CA": "CCPA" } },
    });
    const user = await openTab("region");
    await user.click(part("region-force-trigger"));
    const options = [...document.querySelectorAll('[data-cyd-part="region-force-option"]')];
    expect(options.slice(0, 2).map((o) => o.getAttribute("data-value"))).toEqual(["DE", "US-CA"]);
    expect(options[1]?.textContent).toContain("CCPA");
    // Unmapped regions fall back to the strictest regulation, marked with *.
    const japan = options.find((o) => o.getAttribute("data-value") === "JP");
    expect(japan?.textContent).toContain("GDPR*");
  });

  it("filters by name as well as code", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.click(part("region-force-trigger"));
    await user.type(part("region-force-search"), "texas");
    const values = [...document.querySelectorAll('[data-cyd-part="region-force-option"]')].map(
      (o) => o.getAttribute("data-value"),
    );
    expect(values).toEqual(["US-TX"]);
  });

  it("accepts a typed region code that isn't in the list", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await forceRegion(user, "ca-qc");
    expect(part("region-tab").textContent).toContain("CA-QC");
    expect(part("region-source").textContent).toBe("forced");
  });

  it("forces a region with one click on a quick preset", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR", "US-CA": "CCPA" } },
    });
    const user = await openTab("region");
    await user.click(
      document.querySelector('[data-cyd-part="region-quick"][data-value="US-CA"]') as HTMLElement,
    );
    expect(part("region-source").textContent).toBe("forced");
    expect(part("region-tab").textContent).toContain("CCPA");
  });

  it("closes the dropdown on Escape without closing the panel", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.click(part("region-force-trigger"));
    expect(part("region-force-popover")).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(part("region-force-popover")).toBeNull();
    expect(part("panel")).not.toBeNull();
  });

  it("moves through options with the arrow keys", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.click(part("region-force-trigger"));
    await user.type(part("region-force-search"), "united");
    await user.keyboard("{ArrowDown}{Enter}");
    // Second match for "united": Arab Emirates, Kingdom, States… sorted by name.
    expect(part("region-source").textContent).toBe("forced");
    expect(part("region-force-trigger").textContent).toContain("United Kingdom");
  });
});

describe("RegionTab pending override", () => {
  it("says a new override isn't applied until a reload, and the footer keeps the live region", async () => {
    initCookieYes({
      mode: "cookie-only",
      region: { detect: () => "DE", map: { DE: "GDPR", "US-CA": "CCPA" } },
    });
    const user = await openTab("region");
    expect(part("region-pending")).toBeNull();
    await forceRegion(user, "US-CA");
    expect(part("region-pending").textContent).toContain("DE · GDPR");
    expect(part("region-reload")).not.toBeNull();
    // The preview still shows what applies after the reload.
    expect(part("region-source").textContent).toBe("forced");
    // The footer reports the region the page runs on, not the preview.
    const footer = document.querySelector(".cyd-panel-footer")?.textContent ?? "";
    expect(footer).toContain("DE");
    expect(footer).not.toContain("US-CA");
    await user.click(part("region-clear-override"));
    expect(part("region-pending")).toBeNull();
  });
});

describe("Combobox", () => {
  it("chooses with the mouse, and closes on a click outside", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.click(part("region-force-trigger"));
    await user.click(
      document.querySelector(
        '[data-cyd-part="region-force-option"][data-value="FR"]',
      ) as HTMLElement,
    );
    expect(part("region-force-trigger").textContent).toContain("France");
    await user.click(part("region-force-trigger"));
    expect(part("region-force-popover")).not.toBeNull();
    await user.click(part("region-tab"));
    expect(part("region-force-popover")).toBeNull();
  });

  it("opens from the keyboard and jumps with Home and End", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    part("region-force-trigger").focus();
    await user.keyboard("{ArrowDown}");
    expect(part("region-force-popover")).not.toBeNull();
    await user.keyboard("{End}{ArrowUp}{Home}{Enter}");
    // Home lands on the first option: the region map's only entry.
    expect(part("region-force-trigger").textContent).toContain("Germany");
  });

  it("says when nothing matches, and closes on Tab", async () => {
    initCookieYes({ mode: "cookie-only", region: { detect: () => "DE", map: { DE: "GDPR" } } });
    const user = await openTab("region");
    await user.click(part("region-force-trigger"));
    await user.type(part("region-force-search"), "zzzz zzzz");
    expect(part("region-force-popover").textContent).toContain("No matches");
    await user.keyboard("{Tab}");
    expect(part("region-force-popover")).toBeNull();
  });
});

describe("RegionTab language picker", () => {
  it("switches the runtime's language live", async () => {
    const runtime = initCookieYes({
      mode: "cookie-only",
      regulation: "GDPR",
      i18n: { messages: { fr: { bannerTitle: "Nous utilisons des cookies" } } },
    });
    const user = await openTab("region");
    await user.click(part("language-trigger"));
    await user.type(part("language-search"), "french{Enter}");
    expect(runtime.getLanguageInfo().language).toBe("fr");
    expect(part("language-active").textContent).toContain("(overridden)");
    expect(window.localStorage.getItem("cyd:language")).toBe("fr");
  });

  it("explains when a language has no translations", async () => {
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const user = await openTab("region");
    await user.click(part("language-trigger"));
    await user.type(part("language-search"), "german{Enter}");
    expect(await screen.findByText(/No translations for/)).not.toBeNull();
    warn.mockRestore();
  });

  it("re-applies a stored override on mount, and Reset restores the configured language", async () => {
    window.localStorage.setItem("cyd:language", "fr");
    const runtime = initCookieYes({
      mode: "cookie-only",
      regulation: "GDPR",
      i18n: { messages: { fr: { bannerTitle: "Nous utilisons des cookies" } } },
    });
    const user = await openTab("region");
    expect(runtime.getLanguageInfo().language).toBe("fr");
    await user.click(part("language-clear"));
    expect(runtime.getLanguageInfo().language).toBe("en");
    expect(window.localStorage.getItem("cyd:language")).toBeNull();
  });
});
