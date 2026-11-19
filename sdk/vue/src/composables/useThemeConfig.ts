import type { ThemeConfig } from "@cookieyes/core";
import type { ColorSchemePref } from "../runtime.js";
import { _useRuntime } from "./useRuntime.js";

/**
 * @internal The theme and colour scheme, fixed when the plugin ran (no setter exists), so a
 * plain read off the runtime is enough.
 */
export function _useThemeConfig(name: string): {
  theme: ThemeConfig | undefined;
  colorScheme: ColorSchemePref;
} {
  const runtime = _useRuntime(name);
  return { theme: runtime.theme, colorScheme: runtime.colorScheme };
}
