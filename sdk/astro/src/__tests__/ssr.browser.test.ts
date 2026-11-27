import { type Browser, type BrowserContext, chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

/**
 * The integration's guarantees in a real browser, against a real Astro build: what a static page
 * shows before any of the SDK's JavaScript has run, and what an on-request page holds for each kind
 * of visitor. The fixture's region map sends a California visitor to CCPA.
 */

const staticUrl = inject("staticUrl");
const serverUrl = inject("serverUrl");

// A stored decision under the default five categories (taxonomy hash 2fbx48).
const DECIDED =
  "consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes,functional:no," +
  "analytics:yes,performance:no,advertisement:no,lastRenewedDate:1794396793816";
const CALIFORNIA = { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" };

let browser: Browser;
const contexts: BrowserContext[] = [];

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

/**
 * Opens `path` as a visitor. With `headOnly`, every module script is refused, so the head script is
 * the only code that runs: what the visitor sees at first paint, before the runtime.
 */
async function open(
  origin: string,
  path: string,
  {
    consent,
    headers,
    headOnly = false,
  }: { consent?: string; headers?: Record<string, string>; headOnly?: boolean } = {},
): Promise<Page> {
  const context = await browser.newContext({ extraHTTPHeaders: headers ?? {} });
  contexts.push(context);
  if (consent) {
    await context.addCookies([
      { name: "cookieyes-consent", value: encodeURIComponent(consent), url: origin },
    ]);
  }
  if (headOnly) await context.route("**/_astro/**", (route) => route.abort());
  const page = await context.newPage();
  await page.goto(`${origin}${path}`, { waitUntil: headOnly ? "load" : "networkidle" });
  return page;
}

afterAll(async () => {
  for (const context of contexts) await context.close();
});

const bannerShown = (page: Page) =>
  page.evaluate(() => {
    const card = document.querySelector("[data-cky-banner]");
    return card ? getComputedStyle(card.parentElement as Element).display !== "none" : false;
  });

describe("a static page, before the runtime", () => {
  it("shows a first-time visitor the banner, revealed by the head script alone", async () => {
    const page = await open(staticUrl, "/", { headOnly: true });
    expect(await page.getAttribute("html", "data-cy-banner")).toBe("show");
    expect(await bannerShown(page)).toBe(true);
  });

  it("never shows a returning visitor the banner", async () => {
    const page = await open(staticUrl, "/", { consent: DECIDED, headOnly: true });
    expect(await page.getAttribute("html", "data-cy-banner")).toBeNull();
    expect(await bannerShown(page)).toBe(false);
  });
});

describe("a static page, with the runtime", () => {
  it("takes the first-time banner over without animating it again", async () => {
    const page = await open(staticUrl, "/");
    expect(await page.locator("[data-cy-shell]").count()).toBe(0);
    expect(await page.locator(".cy-banner-wrap[data-cy-entered]").count()).toBe(1);
    expect(await page.getAttribute("link[data-cy-full]", "media")).toBe("all");
  });

  it("removes the hidden banner for a returning visitor and shows the recall button", async () => {
    const page = await open(staticUrl, "/", { consent: DECIDED });
    expect(await page.locator("[data-cky-banner]").count()).toBe(0);
    expect(await page.locator('[data-cy-part="recall"]').count()).toBe(1);
  });

  it("records a decision and runs the callback from src/cookieyes.client.ts", async () => {
    const page = await open(staticUrl, "/");
    await page.click('[data-cy-part="accept-all"]');
    const cookie = (await page.context().cookies()).find((c) => c.name === "cookieyes-consent");
    expect(decodeURIComponent(cookie?.value ?? "")).toContain("action:yes");
    expect(await page.evaluate(() => (window as { __cyUpdated?: boolean }).__cyUpdated)).toBe(true);
  });

  it("keeps the classes given to the slot's components after the runtime takes over", async () => {
    const page = await open(staticUrl, "/custom");
    expect(await page.locator(".cy-banner.site-banner .site-accept").count()).toBe(1);
    await page.click('[data-cy-part="customise"]');
    await page.waitForSelector('[data-cy-part="save"].site-save');
  });
});

describe("an on-request page", () => {
  it("holds the banner for a first-time visitor and none for a returning one", async () => {
    const first = await (await fetch(`${serverUrl}/live`)).text();
    expect(first).toContain('data-cy-part="banner"');
    expect(first).toContain(`<div class="cy-banner-wrap" data-cy-shell>`);
    const returning = await (
      await fetch(`${serverUrl}/live`, { headers: { cookie: `cookieyes-consent=${DECIDED}` } })
    ).text();
    expect(returning).not.toContain('data-cy-part="banner"');
  });

  it("gives a California visitor the CCPA banner, and the runtime agrees", async () => {
    const page = await open(serverUrl, "/live", { headers: CALIFORNIA });
    expect(await page.textContent("#locals")).toBe("read CCPA");
    expect(await page.locator('[data-cy-part="do-not-sell"]').count()).toBe(1);
    expect(await page.locator(".cy-banner-wrap[data-cy-entered]").count()).toBe(1);
  });

  it("serves the stylesheet compressed", async () => {
    const res = await fetch(`${serverUrl}/cookieyes/styles.css`, {
      headers: { "accept-encoding": "gzip" },
    });
    expect(res.headers.get("content-encoding")).toBe("gzip");
  });
});
