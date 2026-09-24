import { type NextRequest, NextResponse } from "next/server";

/**
 * Markdown for agents. A docs request that asks for `text/markdown` gets the page's
 * Markdown, the same text as "Copy as Markdown", from the same URL; the client never needs
 * to know about /api/md. Browsers never ask for Markdown, so they are unaffected.
 */
export function proxy(request: NextRequest) {
  const accept = request.headers.get("accept") ?? "";
  if (!accept.includes("text/markdown")) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/api/md${url.pathname.slice("/docs".length)}`;
  const response = NextResponse.rewrite(url);
  response.headers.set("Vary", "Accept");
  return response;
}

// The bare /docs redirects to a framework root and has no Markdown form.
export const config = { matcher: "/docs/:path+" };
