export type {
  ActiveUI,
  AnyStopHandler,
  BuiltInIntegration,
  CategoryDef,
  CategoryText,
  ColorScheme,
  ConsentAction,
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
  ConsentSource,
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
  getTextDirection,
  mergeTranslations,
  readGpc,
  readServerConsent,
  regionFromHeaders,
  registerStopHandler,
  resolveBuiltInIntegration,
  resolveCategories,
  resolveRegion,
  resolveTranslations,
} from "@cookieyes/core";
/**
 * Re-exported from `@cookieyes/core/iframes` so a Svelte app can block embeds in HTML it does not
 * render itself (CMS or Markdown content): `blockIframes(cy.manager, cy)` with `cy` from
 * `getCookieYes()`. Unused, it is dropped from the bundle.
 */
export { blockIframes, type IframeBlockerStore } from "@cookieyes/core/iframes";
/**
 * Re-exported from `@cookieyes/core/network-blocker` so the `networkBlocker` config key, which
 * lives on this package's config type, is reachable from this package: under pnpm's strict
 * layout a consumer who installed only `@cookieyes/svelte` cannot resolve `@cookieyes/core`. The
 * blocker stays its own entry in core, so it reaches a bundle only if this export is used.
 * `installNetworkBlocker` and `uninstallNetworkBlocker` are deliberately not re-exported: the
 * config key is the only declarative path here.
 */
export { registerNetworkBlocker } from "@cookieyes/core/network-blocker";
// Styling contract: part and state hooks for targeting components in CSS
export { CY_PART, CY_STATE, type CyPart, type CyState } from "@cookieyes/ui";
// Provider: starts the runtime and supplies the per-request regulation so SSR banners are correct
export { default as CookieYesProvider } from "./context/CookieYesProvider.svelte";
export type { CookieYesProviderProps } from "./context/types.js";
// Controls: standalone helpers
export { default as GatedFrame } from "./controls/GatedFrame.svelte";
export { default as GatedScript } from "./controls/GatedScript.svelte";
export { default as RecallButton } from "./controls/RecallButton.svelte";
export type { GatedFrameProps, GatedScriptProps, RecallButtonProps } from "./controls/types.js";
// Hooks
export {
  type ConsentActions,
  type Reactive,
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
// Styled presets: drop-in defaults built from the primitives
export { default as CookieBanner } from "./presets/CookieBanner.svelte";
export { default as CookieOptOut } from "./presets/CookieOptOut.svelte";
export { default as CookiePreferences } from "./presets/CookiePreferences.svelte";
export { default as ReloadNotice } from "./presets/ReloadNotice.svelte";
export type {
  BannerPart,
  CookieBannerProps,
  CookieOptOutProps,
  CookiePreferencesProps,
  DialogPart,
  OptOutPart,
} from "./presets/types.js";
// Headless primitives: each part is exported flat (`BannerRoot`) and through a namespace
// (`<Banner.Root>`). Both name the same component, and an unused part drops out of the bundle.
export * as Banner from "./primitives/banner/index.js";
export {
  AcceptAll as BannerAcceptAll,
  Actions as BannerActions,
  Branding as BannerBranding,
  Close as BannerClose,
  Description as BannerDescription,
  DoNotSell as BannerDoNotSell,
  OpenPreferences as BannerOpenPreferences,
  RejectAll as BannerRejectAll,
  Root as BannerRoot,
  Title as BannerTitle,
} from "./primitives/banner/index.js";
export * as OptOut from "./primitives/opt-out/index.js";
export {
  Branding as OptOutBranding,
  Buttons as OptOutButtons,
  Cancel as OptOutCancel,
  Checkbox as OptOutCheckbox,
  CheckboxLabel as OptOutCheckboxLabel,
  Close as OptOutClose,
  Description as OptOutDescription,
  Root as OptOutRoot,
  Save as OptOutSave,
  Success as OptOutSuccess,
  Title as OptOutTitle,
} from "./primitives/opt-out/index.js";
export * as Preferences from "./primitives/preferences/index.js";
export {
  AcceptAll as PreferencesAcceptAll,
  Branding as PreferencesBranding,
  Categories as PreferencesCategories,
  Category as PreferencesCategory,
  Close as PreferencesClose,
  Description as PreferencesDescription,
  Intro as PreferencesIntro,
  RejectAll as PreferencesRejectAll,
  Root as PreferencesRoot,
  Save as PreferencesSave,
  Title as PreferencesTitle,
} from "./primitives/preferences/index.js";
export type { CategoryRenderProps } from "./primitives/types.js";
export type {
  ColorSchemePref,
  CookieYesRuntime,
  CookieYesSnapshot,
  LanguageInfo,
} from "./runtime.js";
/**
 * @internal Null on the server or before the provider ran. In the public barrel so
 * `@cookieyes/svelte/devtools` can consume it like any other symbol, through the published entry
 * point. Not a supported public API for general use.
 */
export { _tryGetCookieYes, getCookieYes, resetCookieYes } from "./runtime.js";
