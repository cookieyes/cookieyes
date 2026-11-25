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
  YouTubeEmbedUrlOptions,
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
  youTubeEmbedUrl,
} from "@cookieyes/core";
/**
 * Re-exported from `@cookieyes/core/iframes` so a Vue app can block embeds in HTML it does not
 * render itself (CMS or Markdown content): `blockIframes(cy.manager, cy)` with `cy` from
 * `getCookieYes()`. Unused, it is dropped from the bundle.
 */
export { blockIframes, type IframeBlockerStore } from "@cookieyes/core/iframes";
/**
 * Re-exported from `@cookieyes/core/network-blocker` so the `networkBlocker` config key, which
 * lives on this package's config type, is reachable from this package: under pnpm's strict
 * layout a consumer who installed only `@cookieyes/vue` cannot resolve `@cookieyes/core`. The
 * blocker stays its own entry in core, so it reaches a bundle only if this export is used.
 * `installNetworkBlocker` and `uninstallNetworkBlocker` are deliberately not re-exported: the
 * config key is the only declarative path here.
 */
export { registerNetworkBlocker } from "@cookieyes/core/network-blocker";
// Styling contract: part and state hooks for targeting components in CSS
export { CY_PART, CY_STATE, type CyPart, type CyState } from "@cookieyes/ui";
// Composables
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
} from "./composables/index.js";
// Provider: supplies the per-request regulation so SSR banners are correct
export { CookieYesProvider, type CookieYesProviderProps } from "./context/CookieYesProvider.js";
export { GatedFrame, type GatedFrameProps } from "./controls/GatedFrame.js";
export { GatedScript, type GatedScriptProps } from "./controls/GatedScript.js";
// Controls: standalone helpers
export { RecallButton, type RecallButtonProps } from "./controls/RecallButton.js";
export { YouTubeEmbed, type YouTubeEmbedProps } from "./controls/YouTubeEmbed.js";
// The plugin: `app.use(CookieYes, config)` starts the runtime
export { CookieYes } from "./plugin.js";
// Styled presets: drop-in defaults built from the primitives
export { type BannerPart, CookieBanner, type CookieBannerProps } from "./presets/CookieBanner.js";
export { CookieOptOut, type CookieOptOutProps, type OptOutPart } from "./presets/CookieOptOut.js";
export {
  CookiePreferences,
  type CookiePreferencesProps,
  type DialogPart,
} from "./presets/CookiePreferences.js";
export { ReloadNotice } from "./presets/ReloadNotice.js";
// Headless primitives: composable part namespaces
export { Banner } from "./primitives/Banner.js";
export { OptOut } from "./primitives/OptOut.js";
export { Preferences } from "./primitives/Preferences.js";
export type {
  ColorSchemePref,
  CookieYesRuntime,
  CookieYesSnapshot,
  LanguageInfo,
} from "./runtime.js";
/**
 * @internal Null on the server or before the plugin ran. In the public barrel so
 * `@cookieyes/vue/devtools` can consume it like any other symbol, through the published entry
 * point. Not a supported public API for general use.
 */
export { _tryGetCookieYes, getCookieYes, resetCookieYes } from "./runtime.js";
