// The framework-free banner layer: what every CookieYes banner looks like and
// how it behaves, with no framework and no consent logic. Consent decisions
// live in `@cookieyes/core`; drawing the elements is each framework's job.

export {
  type BannerModel,
  banner,
  bannerAnnouncer,
  type CategoryModel,
  OPT_OUT_COUNTDOWN_SECONDS,
  type OptOutModel,
  optOut,
  type PreferencesModel,
  preferences,
  recallButton,
  reloadNotice,
} from "./markup/components.js";
export { cookieYesLogo, crossIcon, revisitIcon, successIcon } from "./markup/icons.js";
export { renderToDom, renderToString, type UiChild, type UiNode } from "./markup/node.js";
export { warnOnStyleCspViolations } from "./styles/csp-warning.js";
export { activateDeferredStylesheets } from "./styles/deferred-stylesheets.js";
export { loadThemeRuntime } from "./styles/load-theme-runtime.js";
export { CY_PART, CY_STATE, type CyPart, type CyState } from "./styles/parts.js";
export { computeThemeVars, type ThemeVars } from "./styles/tokens.js";
