/**
 * The 404 for a missing file — an image, a stylesheet, a font.
 *
 * `next.config.mjs` rewrites asset-shaped paths here, but only as a fallback: the rewrite
 * runs after every real file and route has had its chance, so nothing that exists reaches
 * this. A browser fetching an image has no use for a page of markup, and serving it the
 * full 404 page means shipping the header, the footer and their JavaScript to answer a
 * request for a PNG.
 */
export function GET() {
  return new Response("Not Found\n", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
