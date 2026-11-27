import { type Browser, chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

/**
 * The same scenarios with `<ClientRouter />` (/router-a to /router-b) and with full page loads
 * (/no-router-a to /no-router-b). Page B holds a `<GatedScript />` and a `<GatedFrame />`.
 */

const staticUrl = inject("staticUrl");
let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

async function start(path: string): Promise<Page> {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`${staticUrl}${path}`, { waitUntil: "networkidle" });
  return page;
}

async function next(page: Page, title: string): Promise<void> {
  await page.click("#next");
  await page.waitForFunction((t) => document.querySelector("h1")?.textContent === t, title);
  await page.waitForLoadState("networkidle");
}

const probeLoads = (page: Page) =>
  page.evaluate(() => (window as { __probeLoaded?: number }).__probeLoaded ?? 0);

for (const [name, a, b, router] of [
  ["with the client router", "/router-a", "Router b", true],
  ["with full page loads", "/no-router-a", "No router b", false],
] as const) {
  describe(name, () => {
    it("keeps one banner across navigation", async () => {
      const page = await start(a);
      await page.evaluate(() => {
        (window as { __banner?: Element | null }).__banner =
          document.querySelector("[data-cky-banner]");
      });
      await next(page, b);
      expect(await page.locator("[data-cky-banner]").count()).toBe(1);
      const same = await page.evaluate(
        () =>
          (window as { __banner?: Element | null }).__banner ===
          document.querySelector("[data-cky-banner]"),
      );
      // Under the router the element itself survives; a full load draws a new one.
      expect(same).toBe(router);
    });

    it("loads the gated script and builds the frame on page B only once granted", async () => {
      const page = await start(a);
      await next(page, b);
      expect(await probeLoads(page)).toBe(0);
      expect(await page.locator("iframe").count()).toBe(0);
      await page.click('[data-cy-part="accept-all"]');
      await page.waitForFunction(() => (window as { __probeLoaded?: number }).__probeLoaded === 1);
      expect(await page.locator('iframe[title="Embed"]').count()).toBe(1);
    });

    it("builds the frame at once on page B when consent was already given on A", async () => {
      const page = await start(a);
      await page.click('[data-cy-part="accept-all"]');
      await next(page, b);
      expect(await page.locator('iframe[title="Embed"]').count()).toBe(1);
      expect(await page.locator('[data-cy-part="recall"]').count()).toBe(1);
    });
  });
}

describe("only with the client router", () => {
  it("keeps an open dialog and the head script's verdict across navigation", async () => {
    const page = await start("/router-a");
    await page.click('[data-cy-part="customise"]');
    const dialog = await page.waitForSelector('[data-cy-part="overlay"]');
    await page.evaluate(() => (document.getElementById("next") as HTMLElement).click());
    await page.waitForFunction(() => document.querySelector("h1")?.textContent === "Router b");
    expect(await page.evaluate((el) => el.isConnected, dialog)).toBe(true);
    expect(await page.getAttribute("html", "data-cy-banner")).toBe("show");
  });
});
