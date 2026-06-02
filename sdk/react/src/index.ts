"use client";

// Re-export core types for convenience
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
} from "@cookieyes/core";
export {
  defaultTranslations,
  getOrCreateConsentRuntime,
  resetConsentRuntime,
  resolveTranslations,
} from "@cookieyes/core";
export { GatedFrame } from "./controls/GatedFrame.js";
export { GatedScript } from "./controls/GatedScript.js";
// Controls — standalone helpers
export { RecallButton } from "./controls/RecallButton.js";
// Hooks
export {
  type ConsentActions,
  useBannerVisibility,
  useConsent,
  useConsentActions,
  useConsentCategory,
  useConsentRuntime,
  useOptOutOpen,
  usePreferencesOpen,
  useRegulation,
  useTranslations,
} from "./hooks/index.js";

// Styled presets — drop-in defaults built from the primitives
export { CookieBanner } from "./presets/CookieBanner.js";
export { CookieOptOut } from "./presets/CookieOptOut.js";
export { CookiePreferences } from "./presets/CookiePreferences.js";
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
// Runtime — builder + module-level registry
export {
  createCookieYes,
  getCookieYes,
  resetCookieYes,
} from "./runtime.js";
