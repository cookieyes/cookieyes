/**
 * Generates `src/styles/critical.css` — the paint-critical banner subset of
 * `src/styles/cookieyes.css`.
 *
 * Every rule is copied **verbatim** from the full sheet rather than rewritten, so
 * a page that inlines the subset renders the banner identically to one that
 * doesn't. `src/__tests__/critical-css.test.ts` enforces that byte-identity; this
 * script is what makes it true by construction instead of by hand.
 *
 * Run it whenever a banner rule changes in cookieyes.css:
 *   pnpm --filter @cookieyes/react build:critical-css
 *
 * To include a new rule, add its selector to SELECTORS below. The script fails if
 * a listed selector no longer exists, so a rename can't silently drop a rule from
 * the subset.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const STYLES = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "styles");

/** Exact top-level selectors to carry over, in sheet order. */
const SELECTORS = [
  ":root",
  "@media (prefers-color-scheme: dark)",
  ".cy-banner-wrap",
  ".cy-banner",
  ".cy-banner[data-leaving]",
  ".cy-banner-wrap[data-cy-entered] .cy-banner:not([data-leaving])",
  "@keyframes cy-fade-in",
  "@keyframes cy-fade-out",
  ".cy-banner-text",
  ".cy-banner-title",
  ".cy-banner-description",
  ".cy-banner-description a",
  ".cy-banner-actions",
  ".cy-btn",
  ".cy-btn:hover",
  ".cy-btn:focus-visible",
  ".cy-btn-primary",
  ".cy-btn-primary:hover",
  ".cy-btn-outline",
  ".cy-btn-do-not-sell",
  ".cy-btn-do-not-sell:hover",
  ".cy-banner-close",
  ".cy-banner-close:hover",
  ".cy-banner-close:focus-visible",
  ".cy-banner-footer",
  ".cy-banner-footer--ccpa",
  ".cy-branding",
  ".cy-branding:hover",
  ".cy-branding svg",
  "@media (prefers-reduced-motion: reduce)",
  "@media (max-width: 440px)",
  "@media (max-height: 480px)",
];

/**
 * Multi-selector rules matched by prefix — the style boundary and the `:where()`
 * resets. They name the dialog and widget alongside the banner; those extra
 * selectors are inert on a banner-only page and keeping them verbatim is what
 * preserves byte-identity.
 */
const PREFIXES = [".cy-banner-wrap,\n.cy-dialog-overlay,", ":where(.cy-banner-wrap"];

/** Split CSS into brace-balanced top-level blocks. */
function topLevelBlocks(css) {
  const blocks = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    let depth = 0;
    let end = -1;
    for (let j = open; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) {
        end = j;
        break;
      }
    }
    if (end === -1) break;
    const selector = css
      .slice(i, open)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .trim();
    blocks.push({ selector, text: `${selector} ${css.slice(open, end + 1)}` });
    i = end + 1;
  }
  return blocks;
}

const sheet = readFileSync(join(STYLES, "cookieyes.css"), "utf8");
const blocks = topLevelBlocks(sheet);

const picked = blocks.filter(
  (b) => SELECTORS.includes(b.selector) || PREFIXES.some((p) => b.selector.startsWith(p)),
);

const missing = SELECTORS.filter((s) => !picked.some((p) => p.selector === s));
if (missing.length > 0) {
  console.error(
    `build-critical-css: these selectors are listed but no longer exist in cookieyes.css:\n  ${missing.join("\n  ")}\n` +
      "Either restore them or update SELECTORS in this script.",
  );
  process.exit(1);
}

const header = `/* ── CookieYes — paint-critical banner CSS ─────────────────────────── */
/* GENERATED — do not edit. Run:                                            */
/*   pnpm --filter @cookieyes/react build:critical-css                       */
/*                                                                          */
/* An exact SUBSET of cookieyes.css: only the rules needed to paint the      */
/* consent banner correctly. Everything else — the preferences dialog, the   */
/* opt-out flow, toggles, the revisit widget, the reload notice — lives only */
/* in the full sheet.                                                       */
/*                                                                          */
/* Use this when you want to inline the banner's CSS in <head> and defer the */
/* full stylesheet, so the banner is styled at first paint without making    */
/* ~25 KB render-blocking. If you already import "@cookieyes/react/styles.css" */
/* at your app root, your bundler puts it in the critical path and you don't */
/* need this file.                                                          */

`;

writeFileSync(join(STYLES, "critical.css"), `${header + picked.map((p) => p.text).join("\n")}\n`);
console.log(`build-critical-css: wrote critical.css — ${picked.length} rules`);
