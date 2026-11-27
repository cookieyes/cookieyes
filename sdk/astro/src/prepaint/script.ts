import { _decided } from "./decided.js";

// The head script itself, bundled with core's cookie parser into one inline IIFE at package build
// time (`rollup.config.mjs`). The two names below are filled in per site build, from the site's
// own categories, by `_prepaintScript`.
declare const __CY_TAX__: string;
declare const __CY_DEFAULT__: boolean;

if (!_decided(document.cookie, __CY_TAX__, __CY_DEFAULT__)) {
  document.documentElement.setAttribute("data-cy-banner", "show");
}
