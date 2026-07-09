/** @internal — shared config normalizer consumed by framework adapters. */

export type { _NormalizedConfig } from "./config.js";
export { _normalizeConfig } from "./config.js";
export { generateConsentId, parseCookie, serializeCookie } from "./cookie.js";
export { defaultTranslations, resolveTranslations } from "./i18n.js";
export { createConsentManager } from "./manager.js";
export type {
  BlockedRequestInfo,
  NetworkBlockerConfig,
  NetworkBlockerRule,
} from "./network-blocker.js";
export {
  installNetworkBlocker,
  uninstallNetworkBlocker,
} from "./network-blocker.js";
export {
  getOrCreateConsentRuntime,
  initCookieYes,
  resetConsentRuntime,
} from "./runtime.js";

export type {
  ActiveUI,
  ColorScheme,
  ConsentBackend,
  ConsentCategory,
  ConsentChangePayload,
  ConsentConfig,
  ConsentManager,
  ConsentPayload,
  ConsentRuntime,
  ConsentRuntimeMode,
  ConsentRuntimeOptions,
  ConsentSnapshot,
  ConsentStore,
  ConsentStoreState,
  CookieYesConfig,
  CookieYesOfflineConfig,
  CookieYesSelfHostedConfig,
  I18nConfig,
  Regulation,
  ScriptEntry,
  ThemeConfig,
  TranslationMap,
} from "./types.js";
