/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { minifyCss } from "../../scripts/minify-css.mjs";

/**
 * The shipped stylesheets are minified rather than copied verbatim, because the
 * source is heavily commented and consumers were downloading the prose.
 *
 * A regex-based minifier is only acceptable if it provably cannot change what the
 * CSS means, so these tests check that: every declaration survives, braces stay
 * balanced, and the specific constructs in this sheet that a naive minifier would
 * mangle come through intact.
 */
const styles = join(process.cwd(), "src/styles");
const full = readFileSync(join(styles, "cookieyes.css"), "utf8");
const critical = readFileSync(join(styles, "critical.css"), "utf8");

/** Count declarations by counting `:` inside `{ … }` blocks, ignoring comments. */
function declarationCount(css: string): number {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  let depth = 0;
  let count = 0;
  for (let i = 0; i < noComments.length; i++) {
    const c = noComments[i];
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (c === ";" && depth > 0) count++;
  }
  return count;
}

function bracesBalanced(css: string): boolean {
  let depth = 0;
  for (const c of css) {
    if (c === "{") depth++;
    else if (c === "}" && --depth < 0) return false;
  }
  return depth === 0;
}

describe.each([
  ["cookieyes.css", full],
  ["critical.css", critical],
])("minifyCss(%s)", (_name, source) => {
  const min = minifyCss(source);

  it("removes every comment", () => {
    expect(min).not.toContain("/*");
    expect(min).not.toContain("*/");
  });

  it("actually gets smaller", () => {
    expect(min.length).toBeLessThan(source.length);
  });

  it("keeps braces balanced", () => {
    expect(bracesBalanced(min)).toBe(true);
  });

  it("loses no declarations", () => {
    // The minifier drops the final `;` before `}`, so allow for one per rule.
    const before = declarationCount(source);
    const after = declarationCount(min);
    const rules = (min.match(/\{/g) ?? []).length;
    expect(after).toBeGreaterThanOrEqual(before - rules);
    expect(after).toBeLessThanOrEqual(before);
  });
});

describe("minifyCss preserves the constructs this sheet actually uses", () => {
  const min = minifyCss(full);

  it("keeps the theme token defaults and their values", () => {
    // The space after `:` is retained deliberately: collapsing it is only safe
    // inside a declaration, never in a selector, and telling those apart with a
    // regex is exactly the kind of cleverness that corrupts stylesheets. A few
    // bytes is the right price for a transform that cannot change meaning.
    expect(min).toContain("--cy-bg: #ffffff");
    expect(min).toContain("--cy-text: #212121");
    expect(min).toContain("--cy-radius: 6px");
  });

  it("keeps font-family lists, which contain commas and quoted names", () => {
    // A minifier that collapsed around commas too aggressively would corrupt this.
    expect(min).toContain('"Segoe UI"');
    expect(min).toContain("-apple-system");
  });

  it("keeps color-mix() and its internal commas and percentages", () => {
    expect(min).toContain("color-mix(in srgb,var(--cy-primary) 85%,black)");
  });

  it("keeps at-rules and their conditions", () => {
    expect(min).toContain("@media (prefers-color-scheme: dark)");
    expect(min).toContain("@media (max-width: 440px)");
    expect(min).toContain("@keyframes cy-fade-in");
  });

  it("keeps pseudo-class and attribute selectors intact", () => {
    expect(min).toContain(".cy-btn:focus-visible");
    expect(min).toContain(".cy-banner[data-leaving]");
    expect(min).toContain(":not([data-leaving])");
    expect(min).toContain(":where(");
  });

  it("keeps calc() and min() expressions with their spaces", () => {
    // `calc(100vw - 80px)` is invalid without the spaces around the operator.
    expect(min).toContain("calc(100vw - 80px)");
    expect(min).toContain("min(440px,calc(100vw - 80px))");
  });

  it("keeps multi-value shorthands that rely on spaces", () => {
    expect(min).toContain("1px solid var(--cy-border)");
    expect(min).toContain("border-width: 0 3px 3px 0");
  });
});
