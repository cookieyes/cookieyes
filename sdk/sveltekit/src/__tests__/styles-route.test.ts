// @vitest-environment node
import { describe, expect, it } from "vitest";
import { GET } from "../styles-route.js";

const request = (acceptEncoding?: string) => ({
  request: new Request("https://example.com/cookieyes/styles.css", {
    headers: acceptEncoding ? { "accept-encoding": acceptEncoding } : {},
  }),
});

describe("GET (styles route)", () => {
  it("serves CSS cached as immutable for a year, tagged by content version", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/css; charset=utf-8");
    expect(res.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(res.headers.get("etag")).toMatch(/^".+"$/);
    expect(res.headers.get("vary")).toBe("Accept-Encoding");
    expect(res.headers.get("content-encoding")).toBeNull();
  });

  it("serves the stylesheet itself as the body", async () => {
    expect(await (await GET(request())).text()).toBe("__CY_STYLES_CSS__");
  });

  it("serves it with no event at all", async () => {
    expect((await GET()).headers.get("content-encoding")).toBeNull();
  });

  it("gzips when the client accepts it, preferring gzip over deflate", async () => {
    const res = await GET(request("br, deflate, gzip;q=0.9"));
    expect(res.headers.get("content-encoding")).toBe("gzip");
    const body = await new Response(res.body?.pipeThrough(new DecompressionStream("gzip"))).text();
    expect(body).toBe("__CY_STYLES_CSS__");
  });

  it("falls back to deflate, and to identity for an encoding it cannot produce", async () => {
    expect((await GET(request("deflate"))).headers.get("content-encoding")).toBe("deflate");
    expect((await GET(request("br"))).headers.get("content-encoding")).toBeNull();
  });

  it("never uses an encoding the client refuses with q=0", async () => {
    expect((await GET(request("gzip;q=0, identity"))).headers.get("content-encoding")).toBeNull();
    expect((await GET(request("gzip; q=0, deflate"))).headers.get("content-encoding")).toBe(
      "deflate",
    );
  });
});
