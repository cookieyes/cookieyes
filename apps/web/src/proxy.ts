import { type NextRequest, NextResponse } from "next/server";

/**
 * Markdown for agents. A page requested with `Accept: text/markdown` is served as Markdown
 * from the same URL: docs pages from /api/md (the "Copy as Markdown" text), the landing
 * page and the playground from hand-written files. Browsers never ask for Markdown, so
 * they are unaffected.
 *
 * The Markdown responses carry `Vary: Accept` (set by the routes themselves). The HTML
 * can't: the pages are prerendered, and on Vercel a prerendered page keeps the headers
 * Next stored for it at build time, whatever next.config or vercel.json add.
 */
const PAGE_MARKDOWN: Record<string, string> = {
  "/": "/api/page-md/home",
  "/playground": "/api/page-md/playground",
};

export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = PAGE_MARKDOWN[url.pathname] ?? `/api/md${url.pathname.slice("/docs".length)}`;
  const response = NextResponse.rewrite(url);
  response.headers.set("Vary", "Accept");
  return response;
}

// `/docs/:path*` includes the bare /docs, the framework chooser (served from /api/md).
export const config = { matcher: ["/", "/playground", "/docs/:path*"] };
