import { getCookieYes } from "@cookieyes/react";
import { act, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieYesDevtools } from "../../devtools.js";
import { clearCookie, mountCookieOnly, teardown } from "../test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

async function openTab(tab: string) {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(document.querySelector('[data-cyd-part="trigger"]') as HTMLElement);
  await user.click(document.querySelector(`[data-cyd-part="tab-${tab}"]`) as HTMLElement);
  return user;
}

describe("ConsentTab", () => {
  // Test 10 (design §9)
  it("shows working vs committed side by side, differing on an unsaved toggle", async () => {
    mountCookieOnly("GDPR");
    await openTab("consent");
    const runtime = getCookieYes();
    act(() => {
      runtime.manager.updateCategory("analytics", true); // toggled, not saved
    });
    const row = document.querySelector('[data-cyd-part="consent-row-analytics"]') as HTMLElement;
    expect(row.querySelector('[data-cyd-part="consent-row-analytics-working"]')?.textContent).toBe(
      "true",
    );
    expect(
      row.querySelector('[data-cyd-part="consent-row-analytics-committed"]')?.textContent,
    ).toBe("false");
  });

  // Test 11 (design §9)
  it("updates the committed value live on save", async () => {
    mountCookieOnly("GDPR");
    await openTab("consent");
    const runtime = getCookieYes();
    act(() => {
      runtime.manager.acceptAll();
    });
    const committedCell = document.querySelector(
      '[data-cyd-part="consent-row-analytics-committed"]',
    );
    expect(committedCell?.textContent).toBe("true");
  });

  // Test 25 (design §9)
  it("copies the panel's state as valid JSON containing a consent key", async () => {
    mountCookieOnly("GDPR");
    const user = await openTab("consent");
    // Defined AFTER `userEvent.setup()` (inside openTab): user-event installs
    // its own clipboard stub on setup, which would otherwise clobber this one.
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });
    await user.click(document.querySelector('[data-cyd-part="copy-state-json"]') as HTMLElement);
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const parsed = JSON.parse(writeText.mock.calls[0]?.[0] as string);
    expect(parsed).toHaveProperty("consent");
    expect(() => parsed).not.toThrow();
  });

  it("resets consent from the footer, so the banner shows again", async () => {
    const runtime = mountCookieOnly("GDPR");
    runtime.manager.acceptAll();
    const user = await openTab("consent");
    expect(runtime.getSnapshot().hasActed).toBe(true);
    await user.click(document.querySelector('[data-cyd-part="consent-reset"]') as HTMLElement);
    expect(runtime.getSnapshot().hasActed).toBe(false);
  });
});
