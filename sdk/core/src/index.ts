export type {
  CategoryDef,
  GoogleConsentSignal,
  ResolvedCategories,
} from "./categories.js";
export { DEFAULT_CATEGORIES, resolveCategories } from "./categories.js";
/** @internal — shared config normalizer consumed by framework adapters. */
export type { _NormalizedConfig } from "./config.js";
export { _normalizeConfig } from "./config.js";
export { generateConsentId, parseCookie, parseCookieHeader, serializeCookie } from "./cookie.js";
export {
  _resetOfflineModeWarning,
  _warnOfflineModeDeprecated,
} from "./deprecations.js";
export type { ConsentEmitter } from "./events.js";
export { createConsentEmitter } from "./events.js";
export {
  broadcastGoogleConsent,
  computeGoogleConsent,
} from "./google-consent-mode.js";
export {
  defaultTranslations,
  getTextDirection,
  mergeTranslations,
  pickLanguage,
  primaryOf,
  resolveTranslations,
} from "./i18n.js";
export type { LanguageController } from "./language.js";
export { createLanguageController } from "./language.js";
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
export type { HeaderSource } from "./region.js";
export { _logRegionDecision, readGpc, regionFromHeaders, resolveRegion } from "./region.js";
export {
  getOrCreateConsentRuntime,
  initCookieYes,
  resetConsentRuntime,
} from "./runtime.js";
/** @internal — test-only registry reset consumed by `@cookieyes/test`. */
export { _clearScriptRegistry } from "./scripts.js";
export type { ServerConsentOptions } from "./server-consent.js";
export { readServerConsent } from "./server-consent.js";
export type {
  AnyStopHandler,
  BuiltInIntegration,
  ReloadOnlyHandler,
  StopHandler,
} from "./stop-handlers.js";
export {
  _clearStopHandlers,
  registerStopHandler,
  resolveBuiltInIntegration,
} from "./stop-handlers.js";
export type {
  ActiveUI,
  CategoryText,
  ColorScheme,
  ConsentBackend,
  ConsentCategory,
  ConsentChangePayload,
  ConsentConfig,
  ConsentEventListener,
  ConsentEventOptions,
  ConsentEventPayload,
  ConsentEventType,
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
  LanguageInfo,
  PartialTranslations,
  RegionConfig,
  RegionDecision,
  RegionDetector,
  RegionSource,
  Regulation,
  ReloadNoticeState,
  ScriptEntry,
  TextDirection,
  ThemeConfig,
  TranslationMap,
} from "./types.js";
export { CORE_VERSION } from "./version.js";
