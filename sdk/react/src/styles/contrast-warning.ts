import type { ThemeVars } from "./tokens.js";
import { contrastRatio } from "./tokens.js";

const AA_NORMAL_TEXT = 4.5;
const DOCS_URL = "https://developer.cookieyes.com/docs/styling/css-variables#contrast";
const warned = new Set<string>();

/**
 * Dev-only console warning when a configured `theme` produces a text/background
 * pair below WCAG AA (4.5:1) contrast. Runs once per unique bad pair per colour
 * scheme — see `check()` below for the de-dupe key.
 *
 * `--cy-on-primary`/`--cy-on-widget-bg` are deliberately not checked here:
 * `readableTextOn`'s own algorithm guarantees at least ~4.58:1 against any hex
 * background (the worst case, at the luminance where the two candidate
 * contrasts cross), so a checker call against those two would never fire for a
 * hex background — and for a non-hex background, `contrastRatio` would return
 * `null` and skip silently anyway. Checking them would never add coverage this
 * checker doesn't already structurally lack.
 */
export function warnOnLowContrast(vars: ThemeVars, isDark: boolean): void {
  if (typeof process === "undefined" || process.env?.NODE_ENV === "production") return;
  const scheme = isDark ? "dark" : "light";
  check(scheme, "--cy-text", vars["--cy-text"], "--cy-bg", vars["--cy-bg"]);
  check(scheme, "--cy-muted", vars["--cy-muted"], "--cy-bg", vars["--cy-bg"]);
}

function check(scheme: string, nameA: string, a: string, nameB: string, b: string): void {
  const ratio = contrastRatio(a, b);
  if (ratio === null) return; // unparseable (rgb()/hsl()/named/var()/color-mix()) — skip silently, never a false warning
  if (ratio >= AA_NORMAL_TEXT) return;
  const key = `${scheme}|${nameA}:${a}|${nameB}:${b}`;
  if (warned.has(key)) return;
  warned.add(key);
  if (typeof console === "undefined") return;
  console.warn(
    `[cookieyes] Low contrast in ${scheme} mode: ${nameA} (${a}) on ${nameB} (${b}) is ` +
      `${ratio.toFixed(2)}:1, below the WCAG AA threshold of ${AA_NORMAL_TEXT}:1 for normal text. ` +
      `See ${DOCS_URL} for how to fix this.`,
  );
}
