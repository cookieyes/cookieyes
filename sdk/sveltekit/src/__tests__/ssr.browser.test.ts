import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type Browser, chromium, type Page } from "playwright";
import { afterAll, beforeAll, describe, expect, inject, it } from "vitest";

/**
 * The package's guarantees, checked against a real SvelteKit production build: what the server
 * HTML holds for each kind of visitor, and that the browser hydrates it without a mismatch. The
 * fixture's region map sends a California visitor to CCPA and everyone else to GDPR, and its CSP
 * admits scripts by nonce and the critical CSS by hash only, so a violation is a console error.
 */

const baseUrl = inject("baseUrl");
const distDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist");

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

async function serverResponse(visitor: Visitor, path = "/"): Promise<Response> {
  const headers: Record<string, string> = { ...visitor.headers };
  if (visitor.consent) headers.cookie = `cookieyes-consent=${visitor.consent}`;
  return fetch(`${baseUrl}${path}`, { headers });
}

async function serverHtml(visitor: Visitor, path = "/"): Promise<string> {
  return (await serverResponse(visitor, path)).text();
}

let browser: Browser;

beforeAll(async () => {
  browser = await chromium.launch();
});

afterAll(async () => {
  await browser?.close();
});

/** Loads a page as the visitor and returns the console errors and warnings it logged. */
async function load(visitor: Visitor, path = "/", options: { javaScript?: boolean } = {}) {
  const context = await browser.newContext({
    extraHTTPHeaders: visitor.headers ?? {},
    javaScriptEnabled: options.javaScript ?? true,
  });
  if (visitor.consent) {
    await context.addCookies([{ name: "cookieyes-consent", value: visitor.consent, url: baseUrl }]);
  }
  const page = await context.newPage();
  const messages: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") messages.push(m.text());
  });
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
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

/** The banner and recall markup, without the comments Svelte uses as anchors. */
async function consentMarkup(page: Page): Promise<string> {
  return page.evaluate(() => {
    const parts = document.querySelectorAll('.cy-banner-wrap, [data-cy-part="recall"]');
    return Array.from(parts)
      .map((el) => {
        // Removed as nodes from a copy: a regex over the HTML misses a comment that spans lines.
        const copy = el.cloneNode(true) as Element;
        const walker = document.createTreeWalker(copy, NodeFilter.SHOW_COMMENT);
        const comments: Node[] = [];
        while (walker.nextNode()) comments.push(walker.currentNode);
        for (const comment of comments) comment.parentNode?.removeChild(comment);
        return copy.outerHTML;
      })
      .join("")
      .replace(' data-cy-entered=""', "");
  });
}

describe("server HTML", () => {
  it("holds the banner for a first-time visitor, before any script runs", async () => {
    expect(await serverHtml(VISITORS[0] as Visitor)).toContain('data-cy-part="banner"');
  });

  it("holds no banner for a returning visitor, so nothing can flash", async () => {
    const html = await serverHtml(VISITORS[1] as Visitor);
    expect(html).not.toContain('data-cy-part="banner"');
    expect(html).toContain('data-cy-part="recall"');
  });

  it("sets no style attribute on the banner, so a strict style-src needs nothing for it", async () => {
    const html = await serverHtml(VISITORS[0] as Visitor);
    const banner = html.slice(html.indexOf('class="cy-banner-wrap"'), html.indexOf("</main>"));
    expect(banner).not.toContain("style=");
  });

  it("holds the CCPA banner for a visitor the geo headers place in California", async () => {
    expect(await serverHtml(VISITORS[2] as Visitor)).toContain("Do Not Sell");
  });

  it("opens the head with the charset, then the Consent Mode default, the critical CSS and stylesheet", async () => {
    const html = await serverHtml(VISITORS[0] as Visitor);
    const head = html.slice(html.indexOf("<head>") + "<head>".length);
    // Within the first 1024 bytes, where a browser looks for it.
    expect(html.indexOf("<meta charset")).toBeLessThan(1024);
    expect(head.trimStart()).toMatch(/^<meta charset="utf-8" \/><script[^>]*>window\.dataLayer/);
    expect(head).toMatch(/<\/script><style>:root\{/);
    expect(head).toMatch(
      /<link rel="stylesheet" href="\.\/cookieyes\/styles\.css\?v=\w+" media="print" data-cy-full>/,
    );
  });

  it("copies SvelteKit's nonce onto the Consent Mode script and onto nothing else of ours", async () => {
    const res = await serverResponse(VISITORS[0] as Visitor);
    const html = await res.text();
    const nonce = /'nonce-([^']+)'/.exec(res.headers.get("content-security-policy") ?? "")?.[1];
    expect(nonce).toBeTruthy();
    expect(html).toContain(`<script nonce="${nonce}">window.dataLayer`);
    expect(html).toContain("<style>:root{");
  });

  it("admits the critical CSS by the published hash: the CSP header carries it and the page is clean", async () => {
    const res = await serverResponse(VISITORS[0] as Visitor);
    const critical = readFileSync(join(distDir, "critical.css"), "utf8");
    const hash = createHash("sha256").update(critical, "utf8").digest("base64");
    expect(res.headers.get("content-security-policy")).toContain(`'sha256-${hash}'`);
  });

  it("keeps a prerendered route visitor-neutral: no returning visitor's decision, no region", async () => {
    const returning = await serverHtml(VISITORS[1] as Visitor, "/prerendered");
    expect(returning).toContain('data-cy-part="banner"');
    expect(returning).not.toContain("consentid");
    expect(await serverHtml(VISITORS[2] as Visitor, "/prerendered")).not.toContain("Do Not Sell");
  });

  it("serves the stylesheet compressed and cached for a year", async () => {
    const res = await fetch(`${baseUrl}/cookieyes/styles.css?v=1`, {
      headers: { "accept-encoding": "gzip" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("content-encoding")).toBe("gzip");
  });

  it("writes the head tags into an ssr = false shell too", async () => {
    const html = await serverHtml(VISITORS[0] as Visitor, "/spa");
    expect(html).toContain("<style>:root{");
    expect(html).toContain("data-cy-full");
    expect(html).not.toContain('data-cy-part="banner"');
  });
});

describe("hydration", () => {
  it("would see a mismatch: the control page renders another element in the browser", async () => {
    const server = await load(VISITORS[0] as Visitor, "/?mismatch", { javaScript: false });
    const serverControl = await server.page.locator("#control").evaluate((el) => el.outerHTML);
    await server.close();
    const client = await load(VISITORS[0] as Visitor, "/?mismatch");
    const clientControl = await client.page.locator("#control").evaluate((el) => el.outerHTML);
    await client.close();
    expect(clientControl).not.toBe(serverControl);
  });

  for (const visitor of VISITORS) {
    it(`matches the server HTML for ${visitor.name}`, async () => {
      const server = await load(visitor, "/", { javaScript: false });
      const serverMarkup = await consentMarkup(server.page);
      await server.close();

      const { page, messages, close } = await load(visitor);
      // No hydration warning, and no CSP violation: the page's CSP admits our tags by nonce and
      // hash alone.
      expect(messages).toEqual([]);
      const bannerShown = (await page.locator('[data-cy-part="banner"]').count()) > 0;
      expect(bannerShown).toBe(visitor.consent === undefined);
      expect(await consentMarkup(page)).toBe(serverMarkup);
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

  it("lets the visitor accept, and hides the banner", async () => {
    const { page, close } = await load(VISITORS[0] as Visitor);
    await page.locator('[data-cy-part="accept-all"]').click();
    expect(await page.locator('[data-cy-part="banner"]').count()).toBe(0);
    expect(await consentCookie(page)).toMatch(/action:yes/);
    await close();
  });
});

describe("a prerendered route", () => {
  it("ships the neutral banner for everyone and hydrates it cleanly", async () => {
    // A California visitor: the page was rendered once at build time for nobody, so it carries
    // the strictest rules and the server's geo headers cannot change it.
    const { page, messages, close } = await load(VISITORS[2] as Visitor, "/prerendered");
    expect(messages).toEqual([]);
    expect(await page.locator('[data-cy-part="accept-all"]').count()).toBe(1);
    expect(await page.locator('[data-cy-part="do-not-sell"]').count()).toBe(0);
    await close();
  });
});

describe("a route with ssr = false", () => {
  it("mounts live from the data request: the banner for a first visit", async () => {
    const { page, messages, close } = await load(VISITORS[0] as Visitor, "/spa");
    expect(messages).toEqual([]);
    await page.waitForSelector('[data-cy-part="banner"]');
    await close();
  });

  it("never shows the banner to a returning visitor", async () => {
    const { page, messages, close } = await load(VISITORS[1] as Visitor, "/spa");
    expect(messages).toEqual([]);
    await page.waitForSelector('[data-cy-part="recall"]');
    expect(await page.locator('[data-cy-part="banner"]').count()).toBe(0);
    await close();
  });
});
