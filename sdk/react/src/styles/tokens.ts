import type { ThemeConfig } from "@cookieyes/core";

export type ColorScheme = "light" | "dark" | "system";

// Strip characters that would let a value break out of its CSS declaration.
// Empty after stripping → caller falls back to the default.
function safeCssValue(input: unknown, fallback: string): string {
  if (typeof input !== "string") return fallback;
  const cleaned = input
    .replace(/[;{}<>\\]/g, "")
    .replace(/\/\*|\*\//g, "")
    .replace(/[\r\n]/g, " ")
    .trim()
    .slice(0, 200);
  return cleaned.length > 0 ? cleaned : fallback;
}

export type ThemeVars = {
  "--cy-primary": string;
  "--cy-primary-hover": string;
  "--cy-bg": string;
  "--cy-text": string;
  "--cy-muted": string;
  "--cy-border": string;
  "--cy-widget-bg": string;
  "--cy-radius": string;
  "--cy-font": string;
};

const DARK_OVERRIDES: Pick<ThemeVars, "--cy-bg" | "--cy-text" | "--cy-muted" | "--cy-border"> = {
  "--cy-bg": "#161B27",
  "--cy-text": "#F3F4F6",
  "--cy-muted": "#9CA3AF",
  "--cy-border": "#2D3748",
};

/**
 * Computed as a plain property map, not CSS text, so callers apply it via
 * `element.style.setProperty(name, value)` rather than a generated `<style>`
 * block — that keeps custom theme colors working under a strict
 * `style-src` policy with no `unsafe-inline`/nonce, since CSP only restricts
 * stylesheet content, not direct CSSOM property writes.
 */
export function computeThemeVars(theme: ThemeConfig | undefined, isDark: boolean): ThemeVars {
  const t = theme ?? {};
  const vars: ThemeVars = {
    "--cy-primary": safeCssValue(t.primaryColor, "#1863dc"),
    "--cy-primary-hover": "color-mix(in srgb, var(--cy-primary) 85%, black)",
    "--cy-bg": safeCssValue(t.backgroundColor, "#ffffff"),
    "--cy-text": safeCssValue(t.textColor, "#212121"),
    "--cy-muted": safeCssValue(t.mutedTextColor, "#6B7280"),
    "--cy-border": safeCssValue(t.borderColor, "#f4f4f4"),
    "--cy-widget-bg": "#0056a7",
    "--cy-radius": safeCssValue(t.borderRadius, "6px"),
    "--cy-font": safeCssValue(
      t.fontFamily,
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    ),
  };
  if (isDark) Object.assign(vars, DARK_OVERRIDES);
  return vars;
}
