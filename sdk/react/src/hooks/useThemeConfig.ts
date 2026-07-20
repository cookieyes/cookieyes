"use client";

import type { ThemeConfig } from "@cookieyes/core";
import type { ColorSchemePref } from "../runtime.js";
import { _tryGetCookieYes } from "../runtime.js";

// theme/colorScheme are fixed at mount (no setter exists), so a plain read
// off the runtime is enough — no subscription needed.
export function useThemeConfig(): { theme: ThemeConfig | undefined; colorScheme: ColorSchemePref } {
  const runtime = _tryGetCookieYes();
  return { theme: runtime?.theme, colorScheme: runtime?.colorScheme ?? "system" };
}
