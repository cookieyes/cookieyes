import type { ThemeConfig } from "@cookieyes/core";
import { applyTheme, watchPrefersDark } from "@cookieyes/ui";
import type { ColorSchemePref } from "../runtime.js";

/**
 * @internal Applies the resolved theme to a component's container through `applyTheme`. Effects
 * only run in the browser, which matters because component setup also runs on the server. The
 * second effect re-runs when the element changes, which covers a container destroyed and created
 * again as a new node (the banner hiding and reappearing); a portal move keeps the node, so its
 * variables survive.
 */
export function _useThemeVars(
  getEl: () => HTMLElement | null,
  theme: ThemeConfig | undefined,
  colorScheme: ColorSchemePref,
): void {
  let prefersDark = $state(false);
  $effect(() => {
    if (colorScheme !== "system") return;
    return watchPrefersDark((dark) => {
      prefersDark = dark;
    });
  });
  $effect(() => {
    const el = getEl();
    if (!el) return;
    return applyTheme(el, theme, colorScheme, prefersDark);
  });
}
