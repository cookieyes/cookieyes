import type { ThemeConfig } from "@cookieyes/core";
import { applyTheme, watchPrefersDark } from "@cookieyes/ui";
import { onMounted, onScopeDispose, type ShallowRef, shallowRef, watchPostEffect } from "vue";
import type { ColorSchemePref } from "../runtime.js";

/**
 * @internal Applies the resolved theme to a component's container through `applyTheme`. Created
 * in `onMounted` because setup also runs on the server. The effect re-runs when the element ref
 * changes, which covers a container destroyed and created again as a new node (the banner hiding
 * and reappearing); a Teleport move keeps the node, so its variables survive.
 */
export function _useThemeVars(
  elRef: ShallowRef<HTMLElement | null>,
  theme: ThemeConfig | undefined,
  colorScheme: ColorSchemePref,
): void {
  const prefersDark = shallowRef(false);
  onMounted(() => {
    if (colorScheme === "system") {
      onScopeDispose(
        watchPrefersDark((dark) => {
          prefersDark.value = dark;
        }),
      );
    }
    watchPostEffect((onCleanup) => {
      const el = elRef.value;
      if (!el) return;
      onCleanup(applyTheme(el, theme, colorScheme, prefersDark.value));
    });
  });
}
