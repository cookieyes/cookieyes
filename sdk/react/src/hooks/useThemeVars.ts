"use client";

import type { ThemeConfig } from "@cookieyes/core";
import { type RefObject, useEffect, useState } from "react";
import type { ColorSchemePref } from "../runtime.js";
import { warnOnLowContrast } from "../styles/contrast-warning.js";
import { computeThemeVars } from "../styles/tokens.js";

// Applies theme colors directly to the element via the CSSOM
// (`style.setProperty`) instead of a generated `<style>` block, so custom
// theme colors keep working under a strict `style-src` CSP with no
// `unsafe-inline`/nonce — see computeThemeVars for why.
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
    const vars = computeThemeVars(theme, isDark);
    warnOnLowContrast(vars, isDark); // dev-only; guarded/deduped internally
    for (const [name, value] of Object.entries(vars)) {
      el.style.setProperty(name, value);
    }
  });
}
