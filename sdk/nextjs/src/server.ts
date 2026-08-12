import {
  type ConsentSnapshot,
  readServerConsent,
  type ServerConsentOptions,
} from "@cookieyes/core";

/**
 * Read a returning visitor's stored consent from the incoming request, in a
 * Server Component, Route Handler or middleware.
 *
 * Pass the result to `<CookieYesProvider initialConsent={…}>` and the banner is
 * never sent to a visitor who has already chosen — instead of being sent to
 * everyone and removed on the client, which the visitor sees as the banner
 * appearing and then vanishing.
 *
 * ```tsx
 * // app/layout.tsx
 * import { CookieYesProvider } from "@cookieyes/nextjs";
 * import { getServerConsent } from "@cookieyes/nextjs/server";
 *
 * export default async function RootLayout({ children }) {
 *   const initialConsent = await getServerConsent({ regulation: "GDPR" });
 *   return (
 *     <html lang="en">
 *       <body>
 *         <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
 *           {children}
 *         </CookieYesProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * Returns `null` when there is no decision on record — a first-time visitor, a
 * cookie recording no choice yet, or one written against a different category
 * taxonomy — in which case the banner renders as usual.
 *
 * This module is server-only: it imports `next/headers`, so keep it out of client
 * components. It lives in `@cookieyes/nextjs/server` rather than the main entry
 * for exactly that reason — the main entry is `"use client"`.
 *
 * Reading cookies opts the route into dynamic rendering, as any `cookies()` call
 * does. A statically rendered route has no request to read, so there the banner
 * is server-rendered for everyone and hidden on the client as before.
 */
export async function getServerConsent(
  options: ServerConsentOptions = {},
): Promise<ConsentSnapshot | null> {
  // Imported lazily so merely importing this module doesn't pull `next/headers`
  // into a build that never calls it.
  const { cookies } = await import("next/headers");
  const store = await cookies();
  const header = store
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
  return readServerConsent(header, options);
}
