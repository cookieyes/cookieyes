/// <reference types="node" />
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CookieYesStyles,
  CRITICAL_CSS,
  DEFAULT_STYLES_HREF,
  DEFERRED_STYLESHEET_ATTR,
  STYLES_CSS,
  STYLES_CSS_VERSION,
} from "../styles.js";

/**
 * `<CookieYesStyles />` exists to put the banner's CSS in the first response.
 * Two properties carry the whole design and both are checked here:
 *
 * 1. The markup shape — one inline `<style>`, one deferred `<link>` — because
 *    the runtime finds the link by attribute and a strict CSP admits the style
 *    by hash. Change either and the feature silently stops working.
 * 2. The built values — the inlined bytes must be *exactly*
 *    `@cookieyes/react/critical.css`, and the published hash must be the hash of
 *    those bytes. One stray byte and every consumer's `style-src` rejects the
 *    block with no error visible to us.
 *
 * Source tests see the build-time sentinels, so (2) runs against `dist/` and
 * skips when it has not been built.
 */
const pkgDir = process.cwd();
const reactDist = join(pkgDir, "..", "react", "dist");

describe("<CookieYesStyles /> markup", () => {
  it("renders one inline <style> holding the critical CSS", () => {
    const html = renderToStaticMarkup(<CookieYesStyles />);
    expect(html.match(/<style/g)).toHaveLength(1);
    expect(html).toContain(`<style>${CRITICAL_CSS}</style>`);
  });

  it("renders the full sheet as a deferred, versioned <link> the runtime can find", () => {
    const html = renderToStaticMarkup(<CookieYesStyles />);
    expect(html.match(/<link/g)).toHaveLength(1);
    expect(html).toContain('rel="stylesheet"');
    // `print` is what keeps it off the critical path; the attribute is how
    // `_activateDeferredStylesheets` in @cookieyes/react finds it to flip.
    expect(html).toContain('media="print"');
    expect(html).toContain(`${DEFERRED_STYLESHEET_ATTR}=""`);
    // Cache-busting by content, so an immutable Cache-Control is safe.
    expect(html).toContain(`href="${DEFAULT_STYLES_HREF}?v=${STYLES_CSS_VERSION}"`);
  });

  it("renders no inline <script> — nothing for a strict script-src to admit", () => {
    expect(renderToStaticMarkup(<CookieYesStyles />)).not.toContain("<script");
  });

  it("honours a custom href, appending the version with the right separator", () => {
    expect(renderToStaticMarkup(<CookieYesStyles href="/assets/cy.css" />)).toContain(
      `href="/assets/cy.css?v=${STYLES_CSS_VERSION}"`,
    );
    expect(renderToStaticMarkup(<CookieYesStyles href="/cy.css?x=1" />)).toContain(
      `href="/cy.css?x=1&amp;v=${STYLES_CSS_VERSION}"`,
    );
  });

  it("passes a nonce through to the <style> for nonce-based policies", () => {
    expect(renderToStaticMarkup(<CookieYesStyles nonce="abc123" />)).toContain(
      '<style nonce="abc123">',
    );
  });
});

describe("styles-route GET", () => {
  it("serves the full sheet as immutable CSS, ETagged by content version", async () => {
    const { GET } = await import("../styles-route.js");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
    // Immutable is only safe because <CookieYesStyles /> versions the URL —
    // a new stylesheet is a new URL, never a stale cache hit.
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("etag")).toBe(`"${STYLES_CSS_VERSION}"`);
    // No Accept-Encoding → identity, and caches must key on the header.
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
    expect(await res.text()).toBe(STYLES_CSS);
  });

  it("gzips when the client accepts it — `next start` will not do it for us", async () => {
    const { GET } = await import("../styles-route.js");
    const req = new Request("http://x/cookieyes/styles.css", {
      headers: { "accept-encoding": "gzip, deflate, br" },
    });
    const res = await GET(req);
    expect(res.headers.get("content-encoding")).toBe("gzip");
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
    const { gunzipSync } = await import("node:zlib");
    const body = Buffer.from(await res.arrayBuffer());
    expect(gunzipSync(body).toString("utf8")).toBe(STYLES_CSS);
  });

  it("falls back to identity for an encoding it cannot produce", async () => {
    const { GET } = await import("../styles-route.js");
    const res = await GET(new Request("http://x/", { headers: { "accept-encoding": "br" } }));
    expect(res.headers.get("content-encoding")).toBeNull();
    expect(await res.text()).toBe(STYLES_CSS);
  });
});

describe("built values (dist)", () => {
  const dist = join(pkgDir, "dist", "server.js");
  const skip = !existsSync(dist) || !existsSync(join(reactDist, "critical.css"));

  it.skipIf(skip)(
    "inlines exactly @cookieyes/react/critical.css, and the hash matches",
    async () => {
      const built = (await import(dist)) as typeof import("../server.js");
      const critical = readFileSync(join(reactDist, "critical.css"), "utf8");

      expect(built.CRITICAL_CSS).not.toContain("__CY_");
      expect(built.CRITICAL_CSS).toBe(critical);

      const expected = `'sha256-${createHash("sha256").update(critical, "utf8").digest("base64")}'`;
      expect(built.CRITICAL_CSS_HASH).toBe(expected);
    },
  );

  it.skipIf(skip)(
    "styles-route serves exactly @cookieyes/react/styles.css as immutable CSS",
    async () => {
      const route = (await import(
        join(pkgDir, "dist", "styles-route.js")
      )) as typeof import("../styles-route.js");
      const res = await route.GET();
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/^text\/css/);
      expect(res.headers.get("cache-control")).toContain("immutable");
      expect(await res.text()).toBe(readFileSync(join(reactDist, "styles.css"), "utf8"));
    },
  );
});
