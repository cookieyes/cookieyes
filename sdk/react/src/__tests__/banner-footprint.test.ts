import { describe, expect, it } from "vitest";
import { buildStyleSheet } from "../styles/tokens.js";

/**
 * FIX 1 / FIX 4 — footprint (canonical element ≤15% of viewport) + zero layout shift.
 * Asserted against the generated stylesheet (jsdom cannot measure real pixels).
 */
describe("banner footprint + zero layout shift", () => {
  const sheet = buildStyleSheet(undefined, "light");

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

  it("FIX4: the entry animation mutates only transform/opacity (no layout properties)", () => {
    const match = sheet.match(/@keyframes cy-slide-up \{[\s\S]*?\n\}/);
    if (!match) throw new Error("cy-slide-up keyframes not found");
    const kf = match[0];
    expect(kf).toContain("transform");
    expect(kf).toContain("opacity");
    // None of these layout-affecting properties may animate (they would cause CLS).
    expect(kf).not.toMatch(/\b(width|height|top|left|right|bottom|margin|padding|inset):/);
  });
});
