import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../devtools.js";
import { TAB_IDS } from "../types.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

async function openPanel() {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(document.querySelector('[data-cyd-part="trigger"]') as HTMLElement);
  return user;
}

describe("DevtoolsPanel", () => {
  it("the close button closes the panel", async () => {
    mountCookieOnly("GDPR");
    const user = await openPanel();
    expect(document.querySelector('[data-cyd-part="panel"]')).not.toBeNull();
    await user.click(document.querySelector('[data-cyd-part="panel-close"]') as HTMLElement);
    expect(document.querySelector('[data-cyd-part="panel"]')).toBeNull();
  });

  // Test 7 (design §9)
  it("tablist supports arrow-key navigation, wrapping at the ends", async () => {
    mountCookieOnly("GDPR");
    const user = await openPanel();
    const tabs = () => Array.from(document.querySelectorAll<HTMLElement>('[role="tab"]'));
    expect(tabs()).toHaveLength(TAB_IDS.length);
    tabs()[0]?.focus();
    expect(document.activeElement).toBe(tabs()[0]);

    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs()[1]);

    // Wrap from last to first.
    tabs()[TAB_IDS.length - 1]?.focus();
    await user.keyboard("{ArrowRight}");
    expect(document.activeElement).toBe(tabs()[0]);
  });

  it("has ARIA tablist/tab/tabpanel roles", async () => {
    mountCookieOnly("GDPR");
    await openPanel();
    expect(document.querySelector('[role="tablist"]')).not.toBeNull();
    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(TAB_IDS.length);
    expect(document.querySelector('[role="tabpanel"]')).not.toBeNull();
  });
});
