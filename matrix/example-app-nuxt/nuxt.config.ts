// The region map sends a visitor the geo headers place in California to CCPA and everyone else to
// the strictest regulation, so one build serves both banners. tests/ssr.assert.mjs relies on it.
export default defineNuxtConfig({
  modules: ["@cookieyes/nuxt"],
  cookieyes: { mode: "cookie-only", region: { map: { "US-CA": "CCPA" } } },
  devtools: { enabled: false },
  telemetry: false,
  compatibilityDate: "2025-07-15",
});
