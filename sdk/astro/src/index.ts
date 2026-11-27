// The integration entry, loaded by Astro from `integrations` in astro.config.mjs. Server code (the
// middleware and the stylesheet route) is registered by path; the components are in
// `@cookieyes/astro/components` and the browser functions in `@cookieyes/astro/client`.

export type {
  CategoryDef,
  ConsentSnapshot,
  CookieYesConfig,
  RegionConfig,
  Regulation,
} from "@cookieyes/core";
export { type CookieYesAstroConfig, default } from "./integration.js";
export { CRITICAL_CSS, CRITICAL_CSS_HASH, DEFAULT_STYLES_HREF } from "./styles.js";
