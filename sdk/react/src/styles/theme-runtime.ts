import type { ThemeConfig } from "@cookieyes/core";
import { warnOnLowContrast } from "./contrast-warning.js";
import { computeThemeVars } from "./tokens.js";

/**
 * Everything needed to render a **custom** `theme` — and nothing needed to
 * render the default one.
 *
 * This module exists to be the far side of the `import()` in `useThemeVars`,
 * so that `computeThemeVars`, its CSS sanitiser, the WCAG luminance maths and
 * the dev-only contrast checker all leave the initial download for the
 * majority of consumers, who configure no `theme` at all. For them
 * `cookieyes.css` already declares every one of the twelve tokens — see the
 * header comment there — and recomputing those exact values in JavaScript was
 * shipping a subsystem to produce an answer the stylesheet had already given.
 *
 * It has to be a separate module rather than a branch inside `useThemeVars`.
 * A `if (!theme) return` guard changes nothing a bundler can act on: the
 * static import is still there, so the code still ships. Splitting the module
 * is the only form of the change that moves bytes. Nothing re-exports this
 * from `index.ts`, which is what keeps Rollup from flattening the dynamic
 * import back into the main chunk — the trap documented in
 * `tools/size/README.md` and hit once already by `integrations.ts`.
 */
export function applyThemeVars(
  el: HTMLElement,
  theme: ThemeConfig | undefined,
  isDark: boolean,
): void {
  const vars = computeThemeVars(theme, isDark);
  // Dev-only WCAG contrast check on a customer-configured theme. Guarded at
  // the call site so a production bundle drops the checker, its de-dupe set
  // and `contrastRatio` along with it.
  if (process.env.NODE_ENV !== "production") warnOnLowContrast(vars, isDark);
  // Applied via the CSSOM (`style.setProperty`) rather than a generated
  // `<style>` block, so custom theme colors keep working under a strict
  // `style-src` CSP with no `unsafe-inline`/nonce — see computeThemeVars.
  for (const [name, value] of Object.entries(vars)) {
    el.style.setProperty(name, value);
  }
}
