import { type CategoryDef, resolveCategories } from "./categories.js";
import { parseCookieHeader, rawFieldsToSnapshot } from "./cookie.js";
import type { ConsentSnapshot, Regulation } from "./types.js";

/**
 * The subset of your consent config that affects reading a stored decision.
 * `CookieYesConfig` satisfies this structurally, so you can pass the same object
 * you give `initCookieYes`.
 */
export type ServerConsentOptions = {
  regulation?: Regulation | undefined;
  categories?: CategoryDef[] | undefined;
};

/**
 * Read a visitor's already-made consent decision from a request's `Cookie`
 * header, on the server, with no `document` and no browser APIs.
 *
 * Use it to keep the banner out of the HTML entirely for a returning visitor.
 * Without it the server has no idea whether the visitor has chosen, so it sends
 * banner markup to everyone and the client removes it after hydration — the
 * banner visibly appears and then vanishes, which reads as a bug.
 *
 * Returns `null` whenever the banner *should* be shown:
 * - no consent cookie (a first-time visitor),
 * - a cookie that records no decision yet (`action:no`, e.g. a CCPA visitor who
 *   has an implicit-consent cookie but has not acted),
 * - a corrupt cookie,
 * - a cookie written against a **different category taxonomy**, which the client
 *   also treats as stale and re-requests. The one exception mirrors the client
 *   exactly: a legacy cookie with no taxonomy stamp is still honoured when the
 *   built-in five categories are in effect, so existing visitors are not
 *   re-prompted by an upgrade.
 *
 * Otherwise returns the stored snapshot, ready to hand to `CookieYesProvider`'s
 * `initialConsent`.
 *
 * ```ts
 * // Any SSR framework — pass the request's Cookie header:
 * const initialConsent = readServerConsent(request.headers.get("cookie") ?? "", config);
 * ```
 *
 * In Next.js App Router, prefer `getServerConsent(config)` from
 * `@cookieyes/nextjs`, which reads `cookies()` for you.
 *
 * **Never** put the result on `initCookieYes` or the runtime: the runtime is a
 * module-level singleton shared across concurrent requests, so per-visitor state
 * there would leak between them. It belongs in the component tree.
 */
export function readServerConsent(
  cookieHeader: string,
  options: ServerConsentOptions = {},
): ConsentSnapshot | null {
  if (typeof cookieHeader !== "string" || cookieHeader.length === 0) return null;

  const fields = parseCookieHeader(cookieHeader);
  if (fields == null) return null;

  const resolved = resolveCategories(options.categories);

  // Mirrors createConsentManager's stored-consent validity rule exactly. If the
  // two ever disagree, the server and client reach different conclusions about
  // the same visitor and the banner flashes — the bug this function prevents.
  const storedTax = fields.tax;
  const taxMatches = storedTax === resolved.taxonomyHash;
  const legacyCookie = storedTax === undefined;
  if (!taxMatches && !(legacyCookie && resolved.isDefault)) return null;

  const snapshot = rawFieldsToSnapshot(fields, options.regulation ?? "DEFAULT", resolved);

  // No explicit decision yet → the banner is supposed to show.
  if (!snapshot.hasActed) return null;

  // Stamp the current taxonomy, as the client does after reading the cookie, so
  // the server and hydration snapshots are identical.
  return { ...snapshot, taxonomyHash: resolved.taxonomyHash };
}
