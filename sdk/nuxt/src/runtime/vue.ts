// Auto-imports point at this file, never at "@cookieyes/vue" directly: Nuxt writes those imports
// into the app's own files, and under pnpm's strict layout an app that installed only
// @cookieyes/nuxt cannot resolve @cookieyes/vue from there. This file lives inside this package,
// where the dependency always resolves.
export * from "@cookieyes/vue";
