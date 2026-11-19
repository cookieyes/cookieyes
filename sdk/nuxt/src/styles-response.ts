import { _STYLES_CSS, _STYLES_CSS_VERSION } from "./styles.js";

/**
 * @internal The stylesheet response, shared by the Nitro handler and its tests. The same
 * behaviour as `@cookieyes/nextjs/styles-route`, for the same reasons: cached as immutable for a
 * year because the link carries `?v=<content hash>`, and compressed here because a self-hosted
 * server does not compress a handler's body the way it does a static asset.
 */
export function _stylesResponse(acceptEncoding: string | null | undefined): Response {
  const headers: Record<string, string> = {
    "Content-Type": "text/css; charset=utf-8",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${_STYLES_CSS_VERSION}"`,
    Vary: "Accept-Encoding",
  };

  const encoding = pickEncoding(acceptEncoding);
  if (encoding === null || typeof CompressionStream === "undefined") {
    return new Response(_STYLES_CSS, { status: 200, headers });
  }
  const body = new Blob([_STYLES_CSS]).stream().pipeThrough(new CompressionStream(encoding));
  headers["Content-Encoding"] = encoding;
  return new Response(body, { status: 200, headers });
}

// Brotli is not in the CompressionStream spec, so gzip is the ceiling. An encoding listed with
// `q=0` is one the client refuses, so it is never chosen.
function pickEncoding(acceptEncoding: string | null | undefined): "gzip" | "deflate" | null {
  if (!acceptEncoding) return null;
  const accepted = new Set<string>();
  for (const entry of acceptEncoding.split(",")) {
    const [name, ...params] = entry.trim().split(";");
    const q = params.map((p) => p.trim()).find((p) => p.startsWith("q="));
    if (name && !(q && Number(q.slice(2)) === 0)) accepted.add(name.trim().toLowerCase());
  }
  if (accepted.has("gzip")) return "gzip";
  if (accepted.has("deflate")) return "deflate";
  return null;
}
