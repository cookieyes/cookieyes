/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * FIX 1 / FIX 4 — footprint (canonical element ≤15% of viewport) + zero layout shift.
 * Asserted against the static stylesheet (jsdom cannot measure real pixels).
 */
describe("banner footprint + zero layout shift", () => {
  const sheet = readFileSync(join(process.cwd(), "src/styles/cookieyes.css"), "utf8");

  function baseRule(selector: string): string {
    const start = sheet.indexOf(`${selector} {`);
    if (start === -1) throw new Error(`rule not found: ${selector}`);
    const end = sheet.indexOf("}", start);
    return sheet.slice(start, end);
  }

  it("FIX1: the wrapper generates no box (display: contents)", () => {
    expect(baseRule(".cy-banner-wrap")).toContain("display: contents");
  });

  it("FIX1/FIX4: the visible card is fixed-positioned and out of flow", () => {
    const card = baseRule(".cy-banner");
    expect(card).toContain("position: fixed");
    expect(card).toContain("z-index: 9999999");
  });

  it("FIX1: card footprint is capped at the corner-banner size (≤15% of 1280×720)", () => {
    // min(440px, calc(100vw - 80px)) → ≤440px wide. At 1280×720 a ~440×300 card
    // is ≈14% of the 921,600px² viewport — comfortably under 15%.
    expect(baseRule(".cy-banner")).toContain("min(440px, calc(100vw - 80px))");
    expect(baseRule(".cy-banner")).toContain("max-width: 440px");
  });

  // Extract a full brace-balanced block (handles the nested from/to blocks and
  // any indentation, e.g. when the sheet is wrapped in a @layer).
  function block(marker: string): string {
    const start = sheet.indexOf(marker);
    if (start === -1) throw new Error(`block not found: ${marker}`);
    const open = sheet.indexOf("{", start);
    let depth = 0;
    for (let i = open; i < sheet.length; i++) {
      if (sheet[i] === "{") depth++;
      else if (sheet[i] === "}" && --depth === 0) return sheet.slice(start, i + 1);
    }
    throw new Error(`unbalanced block: ${marker}`);
  }

  it("the entry animation mutates opacity only — no transform, no layout", () => {
    const kf = block("@keyframes cy-fade-in");
    expect(kf).toContain("opacity");
    // A transform would reintroduce the slide-in motion this replaced.
    expect(kf).not.toContain("transform");
    // None of these layout-affecting properties may animate (they would cause CLS).
    expect(kf).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding|inset):/);
  });

  it("the exit animation is also opacity-only (no translate)", () => {
    const kf = block("@keyframes cy-fade-out");
    expect(kf).toContain("opacity");
    expect(kf).not.toContain("transform");
    expect(kf).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding|inset):/);
  });

  it("the banner uses the fade, and the old slide keyframes are gone", () => {
    expect(baseRule(".cy-banner")).toContain("animation: cy-fade-in");
    expect(sheet).not.toContain("cy-slide-up");
  });

  it("the entry animation is short enough not to delay the banner being seen", () => {
    // Paint counts as "present and composited"; a long ramp would
    // still read as a late-appearing banner. Keep it at or under 200ms.
    const match = /animation:\s*cy-fade-in\s+([\d.]+)s/.exec(baseRule(".cy-banner"));
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBeLessThanOrEqual(0.2);
  });
});

describe("the post-hydration node swap does not re-animate", () => {
  // Read independently: the `sheet` above is scoped to the other describe block.
  const sheet = readFileSync(join(process.cwd(), "src/styles/cookieyes.css"), "utf8");

  it("suppresses the entry animation on a re-parented banner", () => {
    // Banner.Root marks the re-parent with data-cy-entered; the banner is already
    // visible at that point, so it must not fade in a second time.
    expect(sheet).toContain(".cy-banner-wrap[data-cy-entered] .cy-banner");
    const start = sheet.indexOf(".cy-banner-wrap[data-cy-entered]");
    const rule = sheet.slice(start, sheet.indexOf("}", start));
    expect(rule).toContain("animation: none");
  });

  it("does not break the exit animation", () => {
    // Without :not([data-leaving]) this rule out-specifies .cy-banner[data-leaving]
    // and the banner would vanish instantly instead of fading out.
    const start = sheet.indexOf(".cy-banner-wrap[data-cy-entered]");
    const selector = sheet.slice(start, sheet.indexOf("{", start));
    expect(selector).toContain(":not([data-leaving])");
  });
});
