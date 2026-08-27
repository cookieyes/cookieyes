"use client";

// Re-export core types for convenience
export type {
  ActiveUI,
  AnyStopHandler,
  BuiltInIntegration,
  CategoryDef,
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
  GoogleConsentSignal,
  HeaderSource,
  I18nConfig,
  PartialTranslations,
  RegionConfig,
  RegionDecision,
  RegionDetector,
  RegionSource,
  Regulation,
  ReloadNoticeState,
  ReloadOnlyHandler,
  ResolvedCategories,
  ScriptEntry,
  ServerConsentOptions,
  StopHandler,
  TextDirection,
  ThemeConfig,
  TranslationMap,
} from "@cookieyes/core";
export {
  DEFAULT_CATEGORIES,
  defaultTranslations,
  getOrCreateConsentRuntime,
  getTextDirection,
  mergeTranslations,
  readGpc,
  readServerConsent,
  regionFromHeaders,
  registerStopHandler,
  resetConsentRuntime,
  resolveBuiltInIntegration,
  resolveCategories,
  resolveRegion,
  resolveTranslations,
} from "@cookieyes/core";
// Provider — supplies the per-request regulation so SSR banners are correct
export {
  CookieYesProvider,
  type CookieYesProviderProps,
} from "./context/CookieYesProvider.js";
export { GatedFrame } from "./controls/GatedFrame.js";
export { GatedScript } from "./controls/GatedScript.js";
// Controls — standalone helpers
export { RecallButton } from "./controls/RecallButton.js";
// Hooks
export {
  type ConsentActions,
  type UseLanguageResult,
  type UseReloadNoticeResult,
  useBannerVisibility,
  useCategories,
  useConsent,
  useConsentActions,
  useConsentCategory,
  useConsentRuntime,
  useLanguage,
  useOnConsentChange,
  useOptOutOpen,
  usePreferencesOpen,
  useRegion,
  useRegulation,
  useReloadNotice,
  useTranslations,
} from "./hooks/index.js";

// Styled presets — drop-in defaults built from the primitives
export { type BannerPart, CookieBanner, type CookieBannerProps } from "./presets/CookieBanner.js";
export { CookieOptOut, type CookieOptOutProps, type OptOutPart } from "./presets/CookieOptOut.js";
export {
  CookiePreferences,
  type CookiePreferencesProps,
  type DialogPart,
} from "./presets/CookiePreferences.js";
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
  LanguageInfo,
  RuntimeMode,
} from "./runtime.js";
// Runtime — canonical initCookieYes + deprecated builder + module-level registry
export {
  createCookieYes,
  getCookieYes,
  initCookieYes,
  resetCookieYes,
} from "./runtime.js";
// Styling contract — part/state hooks for targeting components in CSS
export { CY_PART, CY_STATE, type CyPart, type CyState } from "./styles/parts.js";
