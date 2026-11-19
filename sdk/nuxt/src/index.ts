// The module entry, loaded by Nuxt from `modules` in nuxt.config.ts. Runtime code (the plugin,
// `<CookieYesRoot />`, the stylesheet handler) lives in ./runtime and is registered by path.

export type {
  CategoryDef,
  ConsentSnapshot,
  CookieYesConfig,
  RegionConfig,
  Regulation,
} from "@cookieyes/vue";
export { default, type ModuleOptions } from "./module.js";
export { CRITICAL_CSS, CRITICAL_CSS_HASH, DEFAULT_STYLES_HREF } from "./styles.js";
