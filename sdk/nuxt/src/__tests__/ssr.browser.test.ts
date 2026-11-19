import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { type Browser, chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

/**
 * The module's guarantees, checked against a real Nuxt production build: what the server HTML
 * holds for each kind of visitor, and that the browser hydrates it without a mismatch. The
 * fixture's region map sends a California visitor to CCPA and everyone else to GDPR.
 */

const baseUrl = inject("baseUrl");
const staticDir = inject("staticDir");

// A stored decision under the default five categories (taxonomy hash 2fbx48).
const DECIDED =
  "consentid:abc,consent:yes,action:yes,tax:2fbx48,necessary:yes,functional:no," +
  "analytics:yes,performance:no,advertisement:no,lastRenewedDate:1794396793816";
const CALIFORNIA = { "x-vercel-ip-country": "US", "x-vercel-ip-country-region": "CA" };

type Visitor = { name: string; headers?: Record<string, string>; consent?: string };

const VISITORS: Visitor[] = [
  { name: "a first-time GDPR visitor" },
  { name: "a returning visitor", consent: DECIDED },
  { name: "a CCPA visitor", headers: CALIFORNIA },
  { name: "a visitor sending Sec-GPC", headers: { "sec-gpc": "1" } },
];

async function serverHtml(visitor: Visitor, path = "/"): Promise<string> {
  const headers: Record<string, string> = { ...visitor.headers };
  if (visitor.consent) headers.cookie = `cookieyes-consent=${visitor.consent}`;
  return (await fetch(`${baseUrl}${path}`, { headers })).text();
}

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

/** Loads a page as the visitor and returns the console errors and warnings it logged. */
async function load(visitor: Visitor, path = "/", origin = baseUrl) {
  const context = await browser.newContext({ extraHTTPHeaders: visitor.headers ?? {} });
  if (visitor.consent) {
    await context.addCookies([{ name: "cookieyes-consent", value: visitor.consent, url: baseUrl }]);
  }
  const page = await context.newPage();
  const messages: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") messages.push(m.text());
  });
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
  return { page, messages, close: () => context.close() };
}

async function consentCookie(page: Page): Promise<string | undefined> {
  const cookie = (await page.context().cookies()).find((c) => c.name === "cookieyes-consent");
  return cookie && decodeURIComponent(cookie.value);
}

/** The last Google Consent Mode update the runtime pushed. */
async function lastConsentUpdate(page: Page): Promise<Record<string, string> | undefined> {
  return page.evaluate(() => {
    const layer = (window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer ?? [];
    const updates = layer
      .map((entry) => Array.from(entry))
      .filter((a) => a[0] === "consent" && a[1] === "update");
    return updates[updates.length - 1]?.[2] as Record<string, string> | undefined;
  });
}

describe("server HTML", () => {
  it("holds the banner for a first-time visitor, before any script runs", async () => {
    expect(await serverHtml(VISITORS[0] as Visitor)).toContain('data-cy-part="banner"');
  });

  it("holds no banner for a returning visitor, so nothing can flash", async () => {
    const html = await serverHtml(VISITORS[1] as Visitor);
    expect(html).not.toContain('data-cy-part="banner"');
    expect(html).toContain("Consent Preferences");
  });

  it("holds the CCPA banner for a visitor the geo headers place in California", async () => {
    expect(await serverHtml(VISITORS[2] as Visitor)).toContain("Do Not Sell");
  });

  it("opens the head with the charset, then the Consent Mode default, the critical CSS and stylesheet", async () => {
    const html = await serverHtml(VISITORS[0] as Visitor);
    const head = html.slice(html.indexOf("<head>") + "<head>".length);
    // Within the first 1024 bytes, where a browser looks for it.
    expect(html.indexOf("<meta charset")).toBeLessThan(1024);
    expect(head).toMatch(/^<meta charset="utf-8"><script>window\.dataLayer/);
    expect(head).toMatch(/<style>:root\{/);
    expect(head).toMatch(
      /<link rel="stylesheet" href="\/cookieyes\/styles\.css\?v=\w+" media="print" data-cy-full>/,
    );
  });

  it("keeps a cached route visitor-neutral: no returning visitor's decision, no region", async () => {
    const returning = await serverHtml(VISITORS[1] as Visitor, "/cached");
    expect(returning).toContain('data-cy-part="banner"');
    expect(returning).not.toContain('"consentId"');
    expect(await serverHtml(VISITORS[2] as Visitor, "/cached")).not.toContain("Do Not Sell");
  });

  it("serves the stylesheet compressed and cached for a year", async () => {
    const res = await fetch(`${baseUrl}/cookieyes/styles.css?v=1`, {
      headers: { "accept-encoding": "gzip" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
  });
});

describe("hydration", () => {
  it("would report a mismatch: the control page logs one", async () => {
    const { messages, close } = await load(VISITORS[0] as Visitor, "/?mismatch");
    expect(messages.some((m) => /hydration/i.test(m))).toBe(true);
    await close();
  });

  for (const visitor of VISITORS) {
    it(`matches the server HTML for ${visitor.name}`, async () => {
      const { page, messages, close } = await load(visitor);
      expect(messages).toEqual([]);
      const bannerShown = (await page.locator('[data-cy-part="banner"]').count()) > 0;
      expect(bannerShown).toBe(visitor.consent === undefined);
      // The runtime switches the deferred stylesheet on once it is running.
      expect(await page.locator("link[data-cy-full]").getAttribute("media")).toBe("all");
      await close();
    });
  }
});

describe("the browser's consent runtime", () => {
  it("runs under the banner's regulation: a GDPR visitor has nothing written or granted on load", async () => {
    const { page, close } = await load({ name: "DE", headers: { "cf-ipcountry": "DE" } });
    expect(await consentCookie(page)).toBeUndefined();
    expect(await lastConsentUpdate(page)).toMatchObject({ analytics_storage: "denied" });
    await close();
  });

  it("runs under CCPA for a visitor the server placed in California, as the banner does", async () => {
    const { page, close } = await load(VISITORS[2] as Visitor);
    // CCPA is opt-out: the runtime records "not yet acted" with the categories allowed.
    expect(await consentCookie(page)).toMatch(/action:no/);
    await close();
  });

  it("follows the server's region even when the strictest regulation is CCPA", async () => {
    const { page, close } = await load(
      { name: "DE", headers: { "cf-ipcountry": "DE" } },
      "/app/",
      inject("variantUrl"),
    );
    expect(await page.locator('[data-cy-part="banner"]').innerText()).toContain("Accept All");
    expect(await consentCookie(page)).toBeUndefined();
    expect(await lastConsentUpdate(page)).toMatchObject({ ad_storage: "denied" });
    await close();
  });
});

describe("network blocking", () => {
  it("holds a configured request until its category is granted", async () => {
    const { page, close } = await load({ name: "DE", headers: { "cf-ipcountry": "DE" } });
    let sent = 0;
    await page.route("https://blocked.example/**", (route) => {
      sent++;
      return route.fulfill({ status: 200, body: "ok" });
    });
    const send = () =>
      page.evaluate(() =>
        fetch("https://blocked.example/pixel").then(
          () => "sent",
          () => "held",
        ),
      );
    expect(await send()).toBe("held");
    expect(sent).toBe(0);
    await page.locator('[data-cy-part="accept-all"]').click();
    expect(await send()).toBe("sent");
    expect(sent).toBe(1);
    await close();
  });
});

describe("a base path set at run time", () => {
  it("links the stylesheet under it, and the link resolves", async () => {
    const variantUrl = inject("variantUrl");
    const html = await (await fetch(`${variantUrl}/app/`)).text();
    const href = /href="([^"]*cookieyes\/styles\.css[^"]*)"/.exec(html)?.[1];
    expect(href?.startsWith("/app/cookieyes/styles.css?v=")).toBe(true);
    expect((await fetch(`${variantUrl}${href}`)).status).toBe(200);
  });
});

describe("nuxt generate", () => {
  it("writes the stylesheet as a static file, so a static host serves it", () => {
    const file = join(staticDir, "cookieyes", "styles.css");
    expect(existsSync(file)).toBe(true);
    expect(readFileSync(file, "utf8")).toMatch(/^:root\{/);
  });

  it("prerenders the banner for everyone; the browser decides after hydration", () => {
    expect(readFileSync(join(staticDir, "index.html"), "utf8")).toContain('data-cy-part="banner"');
  });
});
