/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The icons ship as inline SVG, so their path coordinates are shipped bytes.
 *
 * The "Powered by CookieYes" wordmark arrived from a design tool carrying ~14
 * significant digits per coordinate ("5.48703 1.81738C8.08615 …") for a mark
 * whose viewBox is 78x13 and which renders at 78 CSS pixels. Rounding to two
 * decimals moved the largest point by 0.005 of a viewBox unit — a two-hundredth
 * of a CSS pixel, well under one device pixel even at 3x — and took 786 bytes
 * of gzip out of the interface layer, more than half of what deleting the badge
 * outright would save.
 *
 * This test exists because the regression is invisible in review: re-exporting
 * the asset restores the long decimals, the diff looks like a routine asset
 * update, and nothing about the rendered banner changes. The size budget in
 * `tools/size/budgets.json` would eventually catch the bytes; this catches the
 * cause and says what to do about it.
 */
describe("inline SVG coordinate precision", () => {
  const source = readFileSync(join(process.cwd(), "src/components/icons.tsx"), "utf8");

  /** Two decimals on a mark this size is already below one device pixel. */
  const MAX_DECIMALS = 2;

  const paths = [...source.matchAll(/d="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path): path is string => path !== undefined);

  it("finds the path data it is meant to be checking", () => {
    // A refactor that moves the icons or switches to an external asset would
    // otherwise make this whole file silently vacuous.
    expect(paths.length).toBeGreaterThan(5);
  });

  it(`carries at most ${MAX_DECIMALS} decimal places in every coordinate`, () => {
    const offenders: string[] = [];
    for (const path of paths) {
      for (const numeric of path.match(/-?\d+\.\d+/g) ?? []) {
        const decimals = numeric.split(".")[1]?.length ?? 0;
        if (decimals > MAX_DECIMALS) offenders.push(numeric);
      }
    }
    expect(
      offenders,
      `These coordinates carry more than ${MAX_DECIMALS} decimals, which ships bytes no ` +
        `display can resolve. Round the path data (see this file's header) rather than ` +
        `raising the limit: ${offenders.slice(0, 8).join(", ")}${
          offenders.length > 8 ? `, +${offenders.length - 8} more` : ""
        }`,
    ).toEqual([]);
  });

  it("keeps the wordmark's viewBox, so the precision argument still holds", () => {
    // The 2-decimal limit is justified by the mark being 78 units wide and
    // rendered at 78px. A much larger viewBox would need that revisited.
    expect(source).toContain('viewBox="0 0 78 13"');
  });
});
