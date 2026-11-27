import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { _WAIT_CSS } from "../styles.js";
import { GET } from "../styles-route.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const vanillaDist = join(pkgDir, "..", "vanilla", "dist");

function get(acceptEncoding: string | null, isPrerendered = false): Response {
  const headers = new Headers(acceptEncoding === null ? {} : { "accept-encoding": acceptEncoding });
  return GET({ request: new Request("https://example.com/", { headers }), isPrerendered });
}

describe("the stylesheet route", () => {
  it("serves CSS cached as immutable for a year, tagged by content version", () => {
    const res = get(null);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("etag")).toMatch(/^".+"$/);
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
    expect(res.headers.get("content-encoding")).toBeNull();
  });

  it("gzips when the client accepts it, preferring gzip over deflate", async () => {
    const res = get("br, deflate, gzip;q=0.9");
    expect(res.headers.get("content-encoding")).toBe("gzip");
    const body = await new Response(res.body?.pipeThrough(new DecompressionStream("gzip"))).text();
    expect(body.length).toBeGreaterThan(0);
  });

  it("falls back to deflate, and to identity for an encoding it cannot produce", () => {
    expect(get("deflate").headers.get("content-encoding")).toBe("deflate");
    expect(get("br").headers.get("content-encoding")).toBeNull();
  });

  it("never uses an encoding the client refuses with q=0", () => {
    expect(get("gzip;q=0, identity").headers.get("content-encoding")).toBeNull();
    expect(get("gzip; q=0, deflate").headers.get("content-encoding")).toBe("deflate");
  });

  it("writes a prerendered file uncompressed, without reading the build's headers", () => {
    expect(get("gzip", true).headers.get("content-encoding")).toBeNull();
  });
});

describe("_WAIT_CSS", () => {
  it("is a rule of its own, with no @layer", () => {
    expect(_WAIT_CSS).not.toContain("@layer");
    expect(_WAIT_CSS).toContain("[data-cy-wait]");
  });
});

/**
 * Source tests see the build-time sentinels, so the inlined values are checked against `dist/`:
 * the critical CSS must be `@cookieyes/vanilla/critical.css` byte for byte, or the published CSP
 * hash would not admit it.
 */
describe("built values (dist)", () => {
  const dist = join(pkgDir, "dist", "styles.js");
  const skip = !existsSync(dist) || !existsSync(join(vanillaDist, "critical.css"));

  it.skipIf(skip)(
    "inlines @cookieyes/vanilla's critical.css and publishes its sha256",
    async () => {
      const built = (await import(dist)) as typeof import("../styles.js");
      const critical = readFileSync(join(vanillaDist, "critical.css"), "utf8");
      expect(built.CRITICAL_CSS).toBe(critical);
      const hash = createHash("sha256").update(critical, "utf8").digest("base64");
      expect(built.CRITICAL_CSS_HASH).toBe(`'sha256-${hash}'`);
    },
  );

  it.skipIf(skip)("serves @cookieyes/vanilla's styles.css", async () => {
    const built = (await import(dist)) as typeof import("../styles.js");
    expect(built._STYLES_CSS).toBe(readFileSync(join(vanillaDist, "styles.css"), "utf8"));
    expect(built._STYLES_CSS_VERSION).toMatch(/^[A-Za-z0-9]{12}$/);
  });
});
