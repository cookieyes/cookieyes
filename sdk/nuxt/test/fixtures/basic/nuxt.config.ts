// A minimal app the server-render and hydration tests build and serve. Regulation comes from
// the region, so the same build serves a GDPR visitor and a CCPA visitor by geo header.
export default defineNuxtConfig({
  modules: ["@cookieyes/nuxt"],
  cookieyes: {
    mode: "cookie-only",
    region: { map: { "US-CA": "CCPA" } },
    googleConsentMode: true,
    // Requests to this host wait for analytics consent: the module registers the blocker.
    networkBlocker: { rules: [{ id: "probe", domain: "blocked.example", category: "analytics" }] },
  },
  // One HTML for every visitor: the module must not personalise it.
  routeRules: { "/cached": { swr: 60 } },
  devtools: { enabled: false },
  telemetry: false,
  compatibilityDate: "2026-11-01",
  // The tests build this app twice (server and static) into separate folders.
  nitro: { output: { dir: process.env.FIXTURE_OUTPUT_DIR || ".output" } },
});
