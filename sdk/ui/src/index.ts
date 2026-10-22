// The framework-free banner layer: what every CookieYes banner looks like and
// how it behaves, with no framework and no consent logic. Consent decisions
// live in `@cookieyes/core`; drawing the elements is each framework's job.

export { ANNOUNCE_DELAY_MS, announceBanner } from "./behaviour/announce.js";
export {
  bodyPortalRoot,
  closeOnEscape,
  FOCUSABLE,
  focusDialog,
  focusRecallAfterBanner,
  rememberOpener,
  trapFocus,
} from "./behaviour/focus.js";
export { applyTheme, watchPrefersDark } from "./behaviour/theme.js";
export {
  type BannerModel,
  banner,
  bannerAnnouncer,
  type CategoryModel,
  type OptOutModel,
  optOut,
  type PreferencesModel,
  preferences,
  recallButton,
  reloadNotice,
} from "./markup/components.js";
export { cookieYesLogo, crossIcon, revisitIcon, successIcon } from "./markup/icons.js";
export { renderToDom, renderToString, type UiChild, type UiNode } from "./markup/node.js";
export { type CategoryTextSources, categoryText } from "./state/category-text.js";
export {
  initialOptOutState,
  OPT_OUT_COUNTDOWN_SECONDS,
  type OptOutEvent,
  type OptOutState,
  optOutReducer,
  startOptOutCountdown,
} from "./state/opt-out.js";
export { isBannerVisible, isRecallVisible, type SurfaceState } from "./state/visibility.js";
export { warnOnStyleCspViolations } from "./styles/csp-warning.js";
export { activateDeferredStylesheets } from "./styles/deferred-stylesheets.js";
export { loadThemeRuntime } from "./styles/load-theme-runtime.js";
export { CY_PART, CY_STATE, type CyPart, type CyState } from "./styles/parts.js";
export { computeThemeVars, type ThemeVars } from "./styles/tokens.js";
