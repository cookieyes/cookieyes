/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";

/**
 * `critical.css` is the paint-critical subset of `cookieyes.css`,
 * meant to be inlined in <head> so the banner is styled at first paint without
 * making the whole ~25 KB sheet render-blocking.
 *
 * Two things must hold, and both are load-bearing:
 *
 * 1. It is a *subset*, never a rewrite. Every rule in it must be byte-identical
 *    to the same rule in the full sheet — otherwise a page that inlines this
 *    file renders the banner slightly differently from a page that doesn't, and
 *    the two disagree at the moment the full sheet arrives. Divergence between
 *    a copy of the styles and the real ones is exactly the failure this ticket
 *    exists to fix.
 * 2. It stays small enough to be worth inlining.
 */
const dir = join(process.cwd(), "src/styles");
const full = readFileSync(join(dir, "cookieyes.css"), "utf8");
const critical = readFileSync(join(dir, "critical.css"), "utf8");

/** Split CSS into brace-balanced top-level blocks: `{ selector, body }`. */
function blocks(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
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
    const selector = norm(css.slice(i, open));
    out.push({ selector, body: norm(css.slice(open + 1, end)) });
    i = end + 1;
  }
  return out;
}

/** Strip comments and collapse whitespace — comments are free to differ. */
function norm(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Conservative stand-in for a real minifier: no value shortening, so a real
 *  minifier produces this size or smaller. Keeps the budget honest without
 *  adding a build-time CSS minifier just for a test. */
function minify(css: string): string {
  return norm(css)
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

const fullBlocks = blocks(full);
const criticalBlocks = blocks(critical);

describe("critical.css is a byte-identical subset of cookieyes.css", () => {
  it("is not empty and parses into rules", () => {
    expect(criticalBlocks.length).toBeGreaterThan(20);
  });

  it("every rule appears in the full sheet with an identical body", () => {
    for (const rule of criticalBlocks) {
      const match = fullBlocks.find((f) => f.selector === rule.selector);
      expect(match, `selector not found in cookieyes.css: ${rule.selector}`).toBeDefined();
      expect(match?.body, `body differs for: ${rule.selector}`).toBe(rule.body);
    }
  });

  it("carries the banner shell: tokens, wrapper, card, animation, text, actions", () => {
    const selectors = criticalBlocks.map((b) => b.selector);
    for (const needed of [
      ":root",
      ".cy-banner-wrap",
      ".cy-banner",
      "@keyframes cy-fade-in",
      ".cy-banner-title",
      ".cy-banner-description",
      ".cy-banner-actions",
      ".cy-btn",
      ".cy-btn-primary",
      ".cy-btn-outline",
      ".cy-banner-footer",
      ".cy-branding",
    ]) {
      expect(selectors, `missing from critical.css: ${needed}`).toContain(needed);
    }
  });

  it("carries the CCPA banner controls too", () => {
    // The CCPA preset renders Banner.Close + Banner.DoNotSell instead of the
    // GDPR button trio — omitting these would leave CCPA banners unstyled.
    const selectors = criticalBlocks.map((b) => b.selector);
    expect(selectors).toContain(".cy-btn-do-not-sell");
    expect(selectors).toContain(".cy-banner-close");
  });

  it("declares every --cy-* token it references (standalone correctness)", () => {
    // Inlined on its own, with the full sheet still in flight, it must resolve
    // every variable it uses — the same failure the full sheet had.
    const root = criticalBlocks.find((b) => b.selector === ":root");
    expect(root).toBeDefined();
    const referenced = new Set(
      [...critical.matchAll(/var\((--cy-[a-z-]+)/g)].map((m) => m[1] as string),
    );
    for (const name of referenced) {
      expect(root?.body, `--cy-* referenced but not declared: ${name}`).toContain(`${name}:`);
    }
  });

  it("gives no non-banner component its own styling", () => {
    // Dialog, preferences, opt-out, toggle, widget and reload-notice styling
    // belongs to the deferred sheet only.
    //
    // The invariant is "every rule is here *because of* the banner" — not "no
    // rule may mention another component". Several banner rules are shared
    // multi-selector lists that legitimately name siblings: the style boundary,
    // the `:where(...)` resets and the reduced-motion block all list the dialog
    // and widget alongside the banner. Those are copied verbatim precisely so
    // they stay byte-identical to the full sheet, and the extra selectors are
    // inert on a page that only has a banner. What must not appear is a rule
    // that exists *solely* to style a deferred component.
    const bannerish = /cy-banner|cy-btn|cy-branding|cy-fade|^:root$|^@media/;
    for (const rule of criticalBlocks) {
      expect(
        bannerish.test(rule.selector),
        `rule is not banner-related, so it does not belong in critical.css: "${rule.selector}"`,
      ).toBe(true);
    }
  });

  it("omits the deferred components entirely — no stray references", () => {
    // These never appear in a banner selector list, so any occurrence at all
    // means dialog/preferences styling leaked into the critical subset.
    for (const excluded of [
      ".cy-accordion",
      ".cy-optout",
      ".cy-toggle",
      ".cy-dialog-title",
      ".cy-dialog-body",
      ".cy-dialog-footer",
      ".cy-cookie-des-table",
      ".cy-audit-table",
    ]) {
      expect(critical, `critical.css should not mention ${excluded}`).not.toContain(excluded);
    }
  });

  it("is meaningfully smaller than the full sheet", () => {
    expect(minify(critical).length).toBeLessThan(minify(full).length / 2);
  });

  it("fits the inline budget: <= 2 KB gzipped", () => {
    // Basis is gzipped, not raw-minified: an inlined <style> block travels
    // inside the gzip/brotli-compressed HTML document, so compressed size is
    // what actually reaches the visitor. The minified figure is reported in the
    // spec alongside it. See ai-context/designs/ssr-banner-shell-zero-delay.md §3.2.
    const gzipped = gzipSync(Buffer.from(minify(critical))).length;
    expect(gzipped).toBeLessThanOrEqual(2048);
  });
});
