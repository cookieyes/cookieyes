import { _STYLES_CSS, _STYLES_CSS_VERSION } from "./styles.js";

/**
 * @internal The route the integration mounts at `stylesHref`. It behaves as
 * `@cookieyes/nextjs/styles-route` does, for the same reasons: cached as immutable for a year
 * because the link carries `?v=<content hash>`, and compressed here because a self-hosted server
 * does not compress a route's body the way it does a static asset. A prerendered route is written
 * as the uncompressed file, and its build-time request headers are not read.
 */
export function GET({
  request,
  isPrerendered,
}: {
  request: Request;
  isPrerendered?: boolean | undefined;
}): Response {
  const headers: Record<string, string> = {
    "Content-Type": "text/css; charset=utf-8",
    "Cache-Control": "public, max-age=31536000, immutable",
    ETag: `"${_STYLES_CSS_VERSION}"`,
    Vary: "Accept-Encoding",
  };

  const encoding = isPrerendered ? null : pickEncoding(request.headers.get("accept-encoding"));
  if (encoding === null || typeof CompressionStream === "undefined") {
    return new Response(_STYLES_CSS, { status: 200, headers });
  }
  const body = new Blob([_STYLES_CSS]).stream().pipeThrough(new CompressionStream(encoding));
  headers["Content-Encoding"] = encoding;
  return new Response(body, { status: 200, headers });
}

// Brotli is not in the CompressionStream spec, so gzip is the ceiling. An encoding listed with
// `q=0` is one the client refuses, so it is never chosen.
function pickEncoding(acceptEncoding: string | null): "gzip" | "deflate" | null {
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
