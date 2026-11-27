import { parseCookieHeader } from "@cookieyes/core";

/**
 * @internal Whether `cookie` records a decision the runtime will honour: the rule of core's
 * `readServerConsent` and the consent manager, restated over core's own parser. The taxonomy hash
 * must match, or the cookie must carry none while the built-in five categories are in effect, and
 * the visitor must have acted. Region, regulation and GPC play no part, which is why a static page
 * can decide this before it knows where the visitor is. `prepaint-parity.test.ts` holds it to
 * `readServerConsent` over a generated corpus.
 */
export function _decided(cookie: string, taxonomyHash: string, isDefault: boolean): boolean {
  const fields = parseCookieHeader(cookie);
  return (
    fields != null &&
    (fields.tax === taxonomyHash || (fields.tax === undefined && isDefault)) &&
    fields.action === "yes"
  );
}
