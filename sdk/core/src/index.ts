export type {
  CategoryDef,
  GoogleConsentSignal,
  ResolvedCategories,
} from "./categories.js";
export { DEFAULT_CATEGORIES, resolveCategories } from "./categories.js";
/** @internal — shared config normalizer consumed by framework adapters. */
export type { _NormalizedConfig } from "./config.js";
export { _normalizeConfig } from "./config.js";
export { generateConsentId, parseCookie, serializeCookie } from "./cookie.js";
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
  Regulation,
  ReloadNoticeState,
  ScriptEntry,
  ThemeConfig,
  TranslationMap,
} from "./types.js";
