"use client";

import type { ThemeConfig } from "@cookieyes/core";
import { type RefObject, useEffect, useState } from "react";
import type { ColorSchemePref } from "../runtime.js";
import { loadThemeRuntime } from "../styles/load-theme-runtime.js";

/**
 * Attribute written on each component container when the resolved colour
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
 * Applies the resolved theme to a component container.
 *
 * For the default configuration — no `theme`, `colorScheme: "system"` — this
 * does nothing at all, because `cookieyes.css` already declares every token
 * for both colour schemes and its `@media` block already tracks the device
 * preference. That is the common case, and it now costs no JavaScript beyond
 * this hook: `computeThemeVars` and the WCAG maths behind it live in
 * `styles/theme-runtime.ts` and are fetched only when a `theme` is actually
 * configured.
 */
export function useThemeVars(
  containerRef: RefObject<HTMLElement | null>,
  theme: ThemeConfig | undefined,
  colorScheme: ColorSchemePref,
): void {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (colorScheme !== "system" || typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    setPrefersDark(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [colorScheme]);

  // Deliberately no dependency array: the container can unmount and
  // remount as a *new* DOM node (e.g. the banner hiding and reappearing)
  // without theme/colorScheme/prefersDark ever changing, and a dep array
  // wouldn't re-run in that case — leaving the new node with no variables
  // set. Re-applying on every render is cheap and keeps it correct.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const isDark = colorScheme === "dark" || (colorScheme === "system" && prefersDark);

    if (theme === undefined) {
      // The stylesheet is already correct for `system`; for an explicit
      // scheme it needs one attribute to know which side to take.
      if (colorScheme === "system") el.removeAttribute(SCHEME_ATTR);
      else el.setAttribute(SCHEME_ATTR, colorScheme);
      return;
    }

    // A custom theme still needs the computed values, but the attribute goes
    // on first so the container is at least in the right colour scheme while
    // the chunk is in flight — the same first-paint role the `:root` defaults
    // play for an unthemed banner.
    el.setAttribute(SCHEME_ATTR, isDark ? "dark" : "light");
    let cancelled = false;
    loadThemeRuntime().then(({ applyThemeVars }) => {
      if (!cancelled) applyThemeVars(el, theme, isDark);
    });
    return () => {
      cancelled = true;
    };
  });
}
