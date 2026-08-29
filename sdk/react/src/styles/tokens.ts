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

/** Mirrors `safeCssValue`'s notion of "the caller actually supplied something usable". */
function isProvided(input: unknown): boolean {
  if (typeof input !== "string") return false;
  return (
    input
      .replace(/[;{}<>\\]/g, "")
      .replace(/\/\*|\*\//g, "")
      .replace(/[\r\n]/g, " ")
      .trim().length > 0
  );
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
  "--cy-focus": string;
  "--cy-on-primary": string;
  "--cy-on-widget-bg": string;
};

const DARK_OVERRIDES: Pick<
  ThemeVars,
  "--cy-bg" | "--cy-text" | "--cy-muted" | "--cy-border" | "--cy-widget-bg"
> = {
  "--cy-bg": "#161B27",
  "--cy-text": "#F3F4F6",
  "--cy-muted": "#9CA3AF",
  "--cy-border": "#2D3748",
  "--cy-widget-bg": "#1F6FD1",
};

/** Token → the `ThemeConfig` field that, when set, suppresses the dark default. */
const DARK_DEFAULTABLE = {
  "--cy-bg": "backgroundColor",
  "--cy-text": "textColor",
  "--cy-muted": "mutedTextColor",
  "--cy-border": "borderColor",
  "--cy-widget-bg": "widgetBackgroundColor",
} as const satisfies Record<keyof typeof DARK_OVERRIDES, keyof ThemeConfig>;

/**
 * WCAG relative luminance for a hex colour. Hex-only by design: any other CSS
 * colour syntax (rgb(), hsl(), named colours, var(), color-mix(), etc.) is a
 * deliberate limitation, not a bug — it returns `null` rather than attempting
 * to parse or evaluate arbitrary CSS color syntax, which would need
 * `oklch(from ...)` relative-color support (Chrome 119+/Safari 16.4+) this
 * SDK cannot assume. Shared by `contrastRatio` and (through it) `readableTextOn`.
 */
function relativeLuminance(hex: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1];
  if (!digits) return null;
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((c) => c + c)
          .join("")
      : digits;
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16) / 255);
  if (r === undefined || g === undefined || b === undefined) return null;
  const linear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/**
 * WCAG contrast ratio between two colours: `(lighter + 0.05) / (darker + 0.05)`
 * of their relative luminances. Hex-only, inherited from `relativeLuminance` —
 * returns `null` if either input isn't a 3- or 6-digit hex colour, rather than
 * risk a wrong ratio for a colour syntax it can't evaluate.
 *
 * Internal to this package by design — not part of `@cookieyes/react`'s
 * public barrel (`index.ts`). Consumed by `contrast-warning.ts`.
 */
export function contrastRatio(a: string, b: string): number | null {
  const La = relativeLuminance(a);
  const Lb = relativeLuminance(b);
  if (La === null || Lb === null) return null;
  const lighter = Math.max(La, Lb);
  const darker = Math.min(La, Lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Returns a readable near-black or near-white foreground for `background`,
 * picking whichever of white/black has the higher contrast ratio against the
 * input. Hex-only, via `contrastRatio` — falls back to white for anything
 * `contrastRatio` can't evaluate.
 */
function readableTextOn(background: string): string {
  const contrastWithWhite = contrastRatio(background, "#ffffff");
  const contrastWithBlack = contrastRatio(background, "#000000");
  if (contrastWithWhite === null || contrastWithBlack === null) return "#ffffff";
  return contrastWithBlack >= contrastWithWhite ? "#111111" : "#ffffff";
}

/**
 * Computed as a plain property map, not CSS text, so callers apply it via
 * `element.style.setProperty(name, value)` rather than a generated `<style>`
 * block — that keeps custom theme colors working under a strict
 * `style-src` policy with no `unsafe-inline`/nonce, since CSP only restricts
 * stylesheet content, not direct CSSOM property writes.
 */
export function computeThemeVars(theme: ThemeConfig | undefined, isDark: boolean): ThemeVars {
  const t = theme ?? {};
  const primary = safeCssValue(t.primaryColor, "#1863dc");
  const vars: ThemeVars = {
    "--cy-primary": primary,
    "--cy-primary-hover": "color-mix(in srgb, var(--cy-primary) 85%, black)",
    "--cy-bg": safeCssValue(t.backgroundColor, "#ffffff"),
    "--cy-text": safeCssValue(t.textColor, "#212121"),
    "--cy-muted": safeCssValue(t.mutedTextColor, "#6B7280"),
    "--cy-border": safeCssValue(t.borderColor, "#f4f4f4"),
    "--cy-widget-bg": safeCssValue(t.widgetBackgroundColor, "#0056a7"),
    "--cy-radius": safeCssValue(t.borderRadius, "6px"),
    "--cy-font": safeCssValue(
      t.fontFamily,
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    ),
    "--cy-focus": safeCssValue(t.focusColor, "var(--cy-primary)"),
    "--cy-on-primary": "#ffffff",
    "--cy-on-widget-bg": "#ffffff",
  };
  // Dark-mode defaults apply only where the developer did not explicitly set
  // that value — explicit configuration wins in both colour schemes.
  if (isDark) {
    for (const [token, field] of Object.entries(DARK_DEFAULTABLE)) {
      if (!isProvided(theme?.[field as keyof ThemeConfig])) {
        vars[token as keyof typeof DARK_OVERRIDES] =
          DARK_OVERRIDES[token as keyof typeof DARK_OVERRIDES];
      }
    }
  }
  // Derived after the dark-default loop above, so `vars["--cy-widget-bg"]`
  // already holds whichever value actually applies in this colour scheme —
  // a dark-mode widget gets a foreground computed for the dark background.
  vars["--cy-on-primary"] = readableTextOn(primary);
  vars["--cy-on-widget-bg"] = readableTextOn(vars["--cy-widget-bg"]);
  return vars;
}
