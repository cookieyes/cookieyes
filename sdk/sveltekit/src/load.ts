import type { CookieYesRequestState } from "./server-consent.js";

/**
 * A server `load` for the root layout: hands what `cookieyesHandle` read to the page as
 * `data.consent`, for `<CookieYesRoot state={data.consent}>`. It returns plain data that
 * SvelteKit can serialise; `Sec-GPC` stays on the server.
 *
 * @example
 * // src/routes/+layout.server.ts
 * export const load = loadConsent;
 */
export function loadConsent(event: { locals: App.Locals }): { consent: CookieYesRequestState } {
  const request = event.locals.cookieyes;
  if (!request) {
    throw new Error(
      "[cookieyes] loadConsent() found no event.locals.cookieyes. Add cookieyesHandle(config) to src/hooks.server.ts.",
    );
  }
  const { read, initialConsent, region, forcedRegion } = request;
  return { consent: { read, initialConsent, region, forcedRegion } };
}
