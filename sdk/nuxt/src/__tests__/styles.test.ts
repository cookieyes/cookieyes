import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import stylesHandler from "../runtime/server/styles.js";
import { _stylesResponse } from "../styles-response.js";

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const vueDist = join(pkgDir, "..", "vue", "dist");

describe("_stylesResponse", () => {
  it("serves CSS cached as immutable for a year, tagged by content version", async () => {
    const res = _stylesResponse(null);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("etag")).toMatch(/^".+"$/);
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
    expect(res.headers.get("content-encoding")).toBeNull();
  });

  it("gzips when the client accepts it, preferring gzip over deflate", async () => {
    const res = _stylesResponse("br, deflate, gzip;q=0.9");
    expect(res.headers.get("content-encoding")).toBe("gzip");
    const body = await new Response(res.body?.pipeThrough(new DecompressionStream("gzip"))).text();
    expect(body.length).toBeGreaterThan(0);
  });

  it("falls back to deflate, and to identity for an encoding it cannot produce", () => {
    expect(_stylesResponse("deflate").headers.get("content-encoding")).toBe("deflate");
    expect(_stylesResponse("br").headers.get("content-encoding")).toBeNull();
  });

  it("never uses an encoding the client refuses with q=0", () => {
    expect(_stylesResponse("gzip;q=0, identity").headers.get("content-encoding")).toBeNull();
    expect(_stylesResponse("gzip; q=0, deflate").headers.get("content-encoding")).toBe("deflate");
  });
});

describe("the Nitro stylesheet handler", () => {
  it("negotiates from the request's Accept-Encoding", () => {
    const res = stylesHandler({ headers: new Headers({ "accept-encoding": "gzip" }) });
    expect(res.headers.get("content-encoding")).toBe("gzip");
  });
});

/**
 * Source tests see the build-time sentinels, so the inlined values are checked against `dist/`:
 * the critical CSS must be `@cookieyes/vue/critical.css` byte for byte, or the published CSP
 * hash would not admit it.
 */
describe("built values (dist)", () => {
  const dist = join(pkgDir, "dist", "styles.js");
  const skip = !existsSync(dist) || !existsSync(join(vueDist, "critical.css"));

  it.skipIf(skip)("inlines @cookieyes/vue's critical.css and publishes its sha256", async () => {
    const built = (await import(dist)) as typeof import("../styles.js");
    const critical = readFileSync(join(vueDist, "critical.css"), "utf8");
    expect(built.CRITICAL_CSS).toBe(critical);
    const hash = createHash("sha256").update(critical, "utf8").digest("base64");
    expect(built.CRITICAL_CSS_HASH).toBe(`'sha256-${hash}'`);
  });

  it.skipIf(skip)("serves @cookieyes/vue's styles.css", async () => {
    const built = (await import(dist)) as typeof import("../styles.js");
    expect(built._STYLES_CSS).toBe(readFileSync(join(vueDist, "styles.css"), "utf8"));
  });
});
