// `tsc` does not read .astro files, so the entries a page imports are named here too: the typecheck
// step then fails if a leg's Astro breaks the types the package publishes.
import { getConsentActions, getConsentCategory, onConsentChange } from "@cookieyes/astro/client";
import { getServerConsent, getServerRegion } from "@cookieyes/astro/server";

export const entries = {
  getConsentCategory,
  getConsentActions,
  onConsentChange,
  getServerConsent,
  getServerRegion,
};
