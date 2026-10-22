"use client";

import type { ThemeConfig } from "@cookieyes/core";
import { applyTheme, watchPrefersDark } from "@cookieyes/ui";
import { type RefObject, useEffect, useState } from "react";
import type { ColorSchemePref } from "../runtime.js";

/**
 * Applies the resolved theme to a component container, through `applyTheme`
 * in `@cookieyes/ui`. For the default configuration (no `theme`,
 * `colorScheme: "system"`) that does nothing at all, and the token computation
 * is fetched only when a `theme` is actually configured.
 */
export function useThemeVars(
  containerRef: RefObject<HTMLElement | null>,
  theme: ThemeConfig | undefined,
  colorScheme: ColorSchemePref,
): void {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(
    () => (colorScheme === "system" ? watchPrefersDark(setPrefersDark) : undefined),
    [colorScheme],
  );

  // Deliberately no dependency array: the container can unmount and
  // remount as a *new* DOM node (e.g. the banner hiding and reappearing)
  // without theme/colorScheme/prefersDark ever changing, and a dep array
  // wouldn't re-run in that case — leaving the new node with no variables
  // set. Re-applying on every render is cheap and keeps it correct.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    return applyTheme(el, theme, colorScheme, prefersDark);
  });
}
