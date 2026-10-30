import type { ColorScheme, ThemeConfig } from "@cookieyes/core";
import { loadThemeRuntime } from "../styles/load-theme-runtime.js";

/**
 * Attribute written on a component's container when the resolved colour
 * scheme is not the one `@media (prefers-color-scheme)` would pick.
 *
 * `cookieyes.css` carries a matching rule per value, so an explicit
 * `colorScheme: "dark"` on a light-preference device (or the reverse) is
 * corrected by the stylesheet rather than by computing twelve values in
 * JavaScript. An attribute on the container beats the inherited `:root`
 * declaration for that container's subtree, which is the same cascade
 * position the CSSOM writes below rely on.
 */
const SCHEME_ATTR = "data-cy-scheme";

/**
 * Follows the device's dark-mode preference: calls `onChange` now and on every
 * change, until the cleanup runs.
 */
export function watchPrefersDark(onChange: (dark: boolean) => void): () => void {
  if (typeof window.matchMedia !== "function") return () => undefined;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  onChange(mql.matches);
  const listener = (e: MediaQueryListEvent) => onChange(e.matches);
  mql.addEventListener("change", listener);
  return () => mql.removeEventListener("change", listener);
}

/**
 * Applies the colour scheme and any custom `theme` to a component's container.
 *
 * For the default configuration (no `theme`, `colorScheme: "system"`) this
 * does nothing at all: `cookieyes.css` already declares every token for both
 * colour schemes and its `@media` block tracks the device. A custom theme loads
 * the token computation on demand, so a site without one never downloads it.
 * The cleanup stops a load still in flight from writing to the element.
 */
export function applyTheme(
  el: HTMLElement,
  theme: ThemeConfig | undefined,
  colorScheme: ColorScheme,
  prefersDark: boolean,
): () => void {
  const isDark = colorScheme === "dark" || (colorScheme === "system" && prefersDark);
  if (theme === undefined) {
    // The stylesheet is already correct for `system`; for an explicit scheme
    // it needs one attribute to know which side to take.
    if (colorScheme === "system") el.removeAttribute(SCHEME_ATTR);
    else el.setAttribute(SCHEME_ATTR, colorScheme);
    return () => undefined;
  }
  // The attribute goes on first, so the container is in the right colour
  // scheme while the theme code is still loading: the same first-paint role
  // the `:root` defaults play for an unthemed banner.
  el.setAttribute(SCHEME_ATTR, isDark ? "dark" : "light");
  let cancelled = false;
  void loadThemeRuntime().then(({ applyThemeVars }) => {
    if (!cancelled) applyThemeVars(el, theme, isDark);
  });
  return () => {
    cancelled = true;
  };
}
