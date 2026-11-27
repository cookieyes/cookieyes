import type { CookieYesConfig } from "@cookieyes/astro";

// Options that hold functions cannot go in astro.config.mjs, so they live here.
export default {
  onConsentUpdate: () => undefined,
} satisfies Partial<CookieYesConfig>;
