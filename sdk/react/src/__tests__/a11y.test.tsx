import { cleanup, render } from "@testing-library/react";
import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

/**
 * Runs axe-core against a rendered container and asserts zero violations.
 *
 * Caveat: axe-core runs here under jsdom, not a real browser. Layout- and
 * paint-dependent rules (color contrast, visible text sizing, etc.) can't be
 * evaluated in jsdom and are skipped — this catches structural/ARIA
 * regressions (missing names, wrong roles, broken labelling), not the full
 * WCAG surface. See https://developer.cookieyes.com/docs/accessibility for what
 * this does and doesn't cover, including which components are covered here.
 */
async function expectNoViolations(container: Element): Promise<void> {
  const results = await axe.run(container);
  const summary = results.violations
    .map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`)
    .join("\n");
  expect(results.violations, summary).toHaveLength(0);
}

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("accessibility — automated (axe-core, jsdom-scoped)", () => {
  it("banner has no axe violations (GDPR)", async () => {
    mountOffline("GDPR");
    const { container } = render(<CookieBanner />);
    await expectNoViolations(container);
  });

  it("banner has no axe violations (CCPA)", async () => {
    mountOffline("CCPA");
    const { container } = render(<CookieBanner />);
    await expectNoViolations(container);
  });

  it("preferences dialog has no axe violations when open", async () => {
    const rt = mountOffline("GDPR");
    rt.manager.showPreferences();
    const { container } = render(<CookiePreferences />);
    await expectNoViolations(container);
  });

  it("opt-out dialog has no axe violations when open", async () => {
    const rt = mountOffline("CCPA");
    rt.showOptOut();
    const { container } = render(<CookieOptOut />);
    await expectNoViolations(container);
  });
});
