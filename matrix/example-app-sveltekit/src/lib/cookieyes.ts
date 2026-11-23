import type { CookieYesConfig } from "@cookieyes/sveltekit";

// The region map is what lets one build serve a GDPR visitor and, by geo header, a California
// visitor the CCPA banner. One module, imported by the hook and the layout, so both sides run the
// same options. Imported by relative path: SvelteKit 3 no longer defines the `$lib` alias that
// SvelteKit 2 does, and the example app has to build on both.
export const config: CookieYesConfig = {
  mode: "cookie-only",
  region: { map: { "US-CA": "CCPA" } },
};
