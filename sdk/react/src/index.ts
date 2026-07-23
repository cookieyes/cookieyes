"use client";

// Re-export core types for convenience
export type {
  ActiveUI,
  AnyStopHandler,
  BuiltInIntegration,
  CategoryDef,
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
  GoogleConsentSignal,
  I18nConfig,
  Regulation,
  ReloadNoticeState,
  ReloadOnlyHandler,
  ResolvedCategories,
  ScriptEntry,
  StopHandler,
  ThemeConfig,
  TranslationMap,
} from "@cookieyes/core";
export {
  DEFAULT_CATEGORIES,
  defaultTranslations,
  getOrCreateConsentRuntime,
  registerStopHandler,
  resetConsentRuntime,
  resolveBuiltInIntegration,
  resolveCategories,
  resolveTranslations,
} from "@cookieyes/core";
export { GatedFrame } from "./controls/GatedFrame.js";
export { GatedScript } from "./controls/GatedScript.js";
// Controls — standalone helpers
export { RecallButton } from "./controls/RecallButton.js";
// Hooks
export {
  type ConsentActions,
  type UseReloadNoticeResult,
  useBannerVisibility,
  useCategories,
  useConsent,
  useConsentActions,
  useConsentCategory,
  useConsentRuntime,
  useOptOutOpen,
  usePreferencesOpen,
  useRegulation,
  useReloadNotice,
  useTranslations,
} from "./hooks/index.js";

// Styled presets — drop-in defaults built from the primitives
export { CookieBanner } from "./presets/CookieBanner.js";
export { CookieOptOut } from "./presets/CookieOptOut.js";
export { CookiePreferences } from "./presets/CookiePreferences.js";
export { ReloadNotice } from "./presets/ReloadNotice.js";
// Headless primitives — composable slot namespaces
export { Banner } from "./primitives/Banner.js";
export { OptOut } from "./primitives/OptOut.js";
export { Preferences } from "./primitives/Preferences.js";
export type {
  Builder,
  ColorSchemePref,
  CookieYesRuntime,
  CookieYesSnapshot,
  RuntimeMode,
} from "./runtime.js";
// Runtime — canonical initCookieYes + deprecated builder + module-level registry
export {
  createCookieYes,
  getCookieYes,
  initCookieYes,
  resetCookieYes,
} from "./runtime.js";
