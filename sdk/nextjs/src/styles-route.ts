import { STYLES_CSS, STYLES_CSS_VERSION } from "./styles.js";

/**
 * A Route Handler that serves the SDK's full stylesheet, so an app using
 * `<CookieYesStyles />` need not copy the file into `public/` or add a build
 * step. Re-export it from the path `<CookieYesStyles href>` points at:
 *
 * ```ts
 * // app/cookieyes/styles.css/route.ts
 * export { GET } from "@cookieyes/nextjs/styles-route";
 * ```
 *
 * The response is cached as immutable for a year. That is safe because
 * `<CookieYesStyles />` appends `?v=<content hash>` to the URL, so a new SDK
 * version — and therefore a new stylesheet — is a new URL, and the old entry
 * is simply never requested again. The `ETag` is the same hash, for clients
 * that revalidate anyway.
 *
 * **It compresses its own body.** A self-hosted `next start` does not gzip a
 * Route Handler's `Response` the way it does a static chunk, and measured on
 * the consentbench harness that turned a 3.7 KB stylesheet into an 18 KB
 * transfer — wiping out most of the point. So the handler negotiates
 * `Accept-Encoding` itself, using `CompressionStream`, which exists on Node 18+
 * and every Edge runtime. Behind a CDN this is redundant and harmless; the CDN
 * sees an already-compressed body with the right `Vary` and caches it as such.
 *
 * Because the body varies by request header, the route is dynamic rather than
 * prerendered. That is fine: it is a few microseconds of work, and every
 * client and every cache in between keeps the result for a year.
 *
 * The CSS itself is a build-time constant rather than a file read: it works
 * under every runtime and every package manager's `node_modules` layout, and it
 * is byte-identical to `@cookieyes/react/styles.css` by construction — a test
 * asserts it.
 */
export async function GET(request?: Request): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "text/css; charset=utf-8",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${STYLES_CSS_VERSION}"`,
    Vary: "Accept-Encoding",
  };

  const encoding = pickEncoding(request?.headers.get("accept-encoding"));
  if (encoding === null || typeof CompressionStream === "undefined") {
    return new Response(STYLES_CSS, { status: 200, headers });
  }

  const body = new Blob([STYLES_CSS]).stream().pipeThrough(new CompressionStream(encoding));
  headers["Content-Encoding"] = encoding;
  return new Response(body, { status: 200, headers });
}

/**
 * The strongest encoding the client accepts that `CompressionStream` supports.
 * Brotli is not in the `CompressionStream` spec, so `gzip` is the ceiling;
 * `deflate` for the rare client that offers only that. `null` means identity.
 */
function pickEncoding(acceptEncoding: string | null | undefined): "gzip" | "deflate" | null {
  if (!acceptEncoding) return null;
  const offered = acceptEncoding
    .split(",")
    .map((e) => e.trim().split(";")[0]?.toLowerCase())
    .filter((e): e is string => Boolean(e));
  if (offered.includes("gzip")) return "gzip";
  if (offered.includes("deflate")) return "deflate";
  return null;
}
