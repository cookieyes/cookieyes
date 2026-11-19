// The same audits as `a11y.test.ts` in real Chromium with the real stylesheet, so colour contrast
// is checked too. Run with `pnpm --filter @cookieyes/vue test:browser`.
// @ts-expect-error: a stylesheet has no type declarations; Vite loads it in the browser run.
import "@cookieyes/ui/styles.css";
import axe from "axe-core";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { vueDriver } from "./driver.js";

const driver = vueDriver("vue (chromium)", {
  click: (el) => userEvent.click(el),
  press: (key) => userEvent.keyboard(key),
});

async function expectNoViolations(el: Element): Promise<void> {
  const results = await axe.run(el);
  const summary = results.violations
    .map((v) => `${v.id}: ${v.description} (${v.nodes.length} node(s))`)
    .join("\n");
  expect(results.violations, summary).toHaveLength(0);
}

/** The entry animation fades the card in; contrast is measured on the settled colours. */
function fadedIn(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 400));
}

function query(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`not rendered: ${selector}`);
  return el;
}

afterEach(() => driver.unmount());

describe("accessibility: automated (axe-core, Chromium, colour contrast on)", () => {
  it("banner has no axe violations (GDPR)", async () => {
    await driver.mount({ mode: "cookie-only", regulation: "GDPR" });
    await fadedIn();
    await expectNoViolations(query('[data-cy-part="banner"]'));
  });

  it("banner has no axe violations (CCPA)", async () => {
    await driver.mount({ mode: "cookie-only", regulation: "CCPA" });
    await fadedIn();
    await expectNoViolations(query('[data-cy-part="banner"]'));
  });

  it("preferences dialog has no axe violations when open", async () => {
    await driver.mount({ mode: "cookie-only", regulation: "GDPR" });
    await driver.click(query('[data-cy-part="customise"]'));
    await fadedIn();
    await expectNoViolations(query('[data-cy-part="overlay"]'));
  });

  it("opt-out dialog has no axe violations when open", async () => {
    await driver.mount({ mode: "cookie-only", regulation: "CCPA" });
    await driver.click(query('[data-cy-part="do-not-sell"]'));
    await fadedIn();
    await expectNoViolations(query('[data-cy-part="optout"]'));
  });
});
