import type { CookieYesConfig } from "@cookieyes/sveltekit";

// Regulation comes from the region, so the same build serves a GDPR visitor and a CCPA visitor by
// geo header.
export const config: CookieYesConfig = {
  mode: "cookie-only",
  region: { map: { "US-CA": "CCPA" } },
};
