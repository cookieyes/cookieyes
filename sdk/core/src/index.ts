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
  resetConsentRuntime,
} from "./runtime.js";

export type {
  ActiveUI,
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
  I18nConfig,
  Regulation,
  ScriptEntry,
  ThemeConfig,
  TranslationMap,
} from "./types.js";
