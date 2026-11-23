import axe from "axe-core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import YouTubeEmbed from "../controls/YouTubeEmbed.svelte";
import CookieBanner from "../presets/CookieBanner.svelte";
import CookieOptOut from "../presets/CookieOptOut.svelte";
import CookiePreferences from "../presets/CookiePreferences.svelte";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, mountWith, settle, unmountAll } from "./test-utils.js";

/**
 * Runs axe-core against a rendered element and asserts zero violations.
 *
 * Caveat: axe-core runs here under jsdom, not a real browser. Layout- and paint-dependent rules
 * (colour contrast, visible text sizing, and so on) cannot be evaluated in jsdom and are
 * skipped: this catches structural and ARIA regressions (missing names, wrong roles, broken
 * labelling), not the full WCAG surface. `a11y.browser.test.ts` runs the audit in Chromium with
 * colour contrast on.
 */
async function expectNoViolations(el: Element): Promise<void> {
  const results = await axe.run(el, { rules: { "color-contrast": { enabled: false } } });
  const summary = results.violations
    .map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`)
    .join("\n");
  expect(results.violations, summary).toHaveLength(0);
}

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`not rendered: ${selector}`);
  return el;
}

beforeEach(clearCookie);
afterEach(unmountAll);

// axe-core audits every node of the banner and the dialogs; in jsdom on a busy CI runner that
// alone can take longer than the 5 s default.
describe("accessibility: automated (axe-core, jsdom-scoped)", () => {
  it("banner has no axe violations (GDPR)", { timeout: 30_000 }, async () => {
    mountWith(cookieOnly("GDPR"), CookieBanner);
    await settle();
    await expectNoViolations(query('[data-cy-part="banner"]'));
  });

  it("banner has no axe violations (CCPA)", { timeout: 30_000 }, async () => {
    mountWith(cookieOnly("CCPA"), CookieBanner);
    await settle();
    await expectNoViolations(query('[data-cy-part="banner"]'));
  });

  it("preferences dialog has no axe violations when open", { timeout: 30_000 }, async () => {
    mountWith(cookieOnly("GDPR"), CookiePreferences);
    getCookieYes().manager.showPreferences();
    await settle();
    await expectNoViolations(query('[data-cy-part="overlay"]'));
  });

  it("opt-out dialog has no axe violations when open", { timeout: 30_000 }, async () => {
    mountWith(cookieOnly("CCPA"), CookieOptOut);
    getCookieYes().showOptOut();
    await settle();
    await expectNoViolations(query('[data-cy-part="optout"]'));
  });

  it("YouTube placeholder has no axe violations", { timeout: 30_000 }, async () => {
    mountWith(cookieOnly("GDPR"), YouTubeEmbed, {
      videoId: "jNQXAC9IVRw",
      title: "Me at the zoo",
      poster: "/zoo.jpg",
    });
    await settle();
    await expectNoViolations(query(".cy-youtube"));
  });
});
