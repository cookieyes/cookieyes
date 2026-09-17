import { NextResponse } from "next/server";

/**
 * The 404 for any `/api` path no route above matched.
 *
 * Without this, an unmatched API path falls through to the app's HTML 404 page: a client
 * that asked for JSON gets a page of markup, and reads the failure as a parse error rather
 * than a missing endpoint. Next picks the more specific route first, so the real endpoints
 * are unaffected.
 */
function notFound() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}

export const GET = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const HEAD = notFound;
export const OPTIONS = notFound;
