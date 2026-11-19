/*
 * @cookieyes/nuxt as its quick start sets it up: the module in `modules` and `<CookieYesRoot />`
 * in app.vue. The rest is the empty Nuxt app every Nuxt fixture shares, so the figure is the
 * module's cost over an empty Nuxt app, measured the same way as the others.
 */
export default defineNuxtConfig({
  modules: ["@cookieyes/nuxt"],
  cookieyes: { mode: "cookie-only", regulation: "GDPR" },
  compatibilityDate: "2026-11-01",
  devtools: { enabled: false },
  telemetry: false,
});
