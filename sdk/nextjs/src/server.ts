import {
  type ConsentSnapshot,
  readServerConsent,
  type ServerConsentOptions,
} from "@cookieyes/core";

/**
 * Declared locally rather than pulled in from `@types/node` — see the
 * identical note in core's `deprecations.ts`.
 */
declare const process: { env: { NODE_ENV?: string } };

/**
 * Dev-only `forceRegion` reader (`@cookieyes/devtools`, AD-4) — server-side,
 * parsing the joined `"name=value; name2=value2"` cookie header string (built
 * from `cookies().getAll()`), not `document.cookie`. Deliberately NOT
 * exported from `@cookieyes/core` and NOT shared with the client-side reader
 * in `@cookieyes/react` — a plain, unexported, single-call-site function is
 * eliminated by the same dead-code pass that removes its only caller once the
 * guard around that caller folds away in production.
 */
function readForcedRegionFromCookieHeader(cookieHeader: string): string | undefined {
  const match = /(?:^|;\s*)__cyd_region=([^;]*)/.exec(cookieHeader);
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    // A malformed cookie value is ignored rather than failing the request.
    return undefined;
  }
}

export { GoogleConsentMode } from "./google-consent-mode.js";
export {
  CookieYesStyles,
  type CookieYesStylesProps,
  CRITICAL_CSS,
  CRITICAL_CSS_HASH,
  DEFAULT_STYLES_HREF,
} from "./styles.js";

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

/** Which request header (name + the value it carried) drove an unforced region decision. */
export type ServerDrivingSignal = { header: string; value: string };

/** What `getServerRegion` reports about how the (unforced) decision was reached. */
export type ServerRegionInfo = {
  /** Region read from the request's geo headers (e.g. "US-CA"), if any. */
  region: string | undefined;
  /**
   * The header (name + value) that supplied `region` — e.g.
   * `{ header: "x-vercel-ip-country", value: "GB" }` — for the devtools
   * Region tab (Story 3.5). `undefined` when no known geo header was present
   * (the decision fell back to `strictest`).
   */
  drivingSignal: ServerDrivingSignal | undefined;
  /** Whether the request sent the `Sec-GPC: 1` "do not sell/share" signal. */
  gpc: boolean;
  /**
   * A `@cookieyes/devtools` region override read from the request's
   * `__cyd_region` cookie — dev-only; always `undefined` in a production
   * build. See `resolveRegion`'s `forced` parameter (AD-4).
   */
  forcedRegion: string | undefined;
};

const GEO_HEADERS: ReadonlyArray<{ country: string; region?: string }> = [
  { country: "x-vercel-ip-country", region: "x-vercel-ip-country-region" },
  { country: "cf-ipcountry" },
];

/**
 * Server-side counterpart to the devtools Region tab (Story 3): reads the
 * incoming request's geo headers (the same ones `regionFromHeaders` tries,
 * walked here too so the exact header + value that matched can be reported —
 * `regionFromHeaders` itself only returns the resolved region string) and the
 * `Sec-GPC` signal, plus, in development only, the `__cyd_region` cookie a
 * `forceRegion` override in `@cookieyes/devtools` writes — so a
 * server-rendered banner reflects the same forced region the client will
 * apply, instead of flashing between the two. Pass `forcedRegion` into
 * `<CookieYesProvider forcedRegion={...}>` to apply it server-side.
 *
 * This module is server-only (imports `next/headers`); see `getServerConsent`
 * above for why that means `@cookieyes/nextjs/server`, not the main entry.
 */
export async function getServerRegion(): Promise<ServerRegionInfo> {
  const { headers, cookies } = await import("next/headers");
  const headerStore = await headers();

  let region: string | undefined;
  let drivingSignal: ServerDrivingSignal | undefined;
  for (const { country, region: regionHeader } of GEO_HEADERS) {
    const countryCode = headerStore.get(country);
    if (!countryCode) continue;
    const regionCode = regionHeader ? headerStore.get(regionHeader) : undefined;
    region = regionCode ? `${countryCode}-${regionCode}` : countryCode;
    drivingSignal = regionCode
      ? { header: regionHeader as string, value: regionCode }
      : { header: country, value: countryCode };
    break;
  }
  const gpc = headerStore.get("sec-gpc") === "1";

  // Dev-only: guarded so this is never read (and the reader is dead code) in a
  // production bundle.
  let forcedRegion: string | undefined;
  if (process.env.NODE_ENV !== "production") {
    const store = await cookies();
    const cookieHeader = store
      .getAll()
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");
    forcedRegion = readForcedRegionFromCookieHeader(cookieHeader);
  }

  return { region, drivingSignal, gpc, forcedRegion };
}
