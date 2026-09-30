import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../devtools.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

function panel() {
  return document.querySelector('[data-cyd-part="panel"]');
}
function trigger() {
  return document.querySelector('[data-cyd-part="trigger"]') as HTMLElement;
}

describe("CookieYesDevtools", () => {
  // Test 4 (design §9)
  it("clicking the trigger opens the panel", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    render(<CookieYesDevtools />);
    expect(panel()).toBeNull();
    await user.click(trigger());
    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
  });

  // Test 5 (design §9)
  it("Escape closes the panel", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    render(<CookieYesDevtools />);
    await user.click(trigger());
    expect(panel()).not.toBeNull();
    await user.keyboard("{Escape}");
    expect(panel()).toBeNull();
  });

  // Test 6 (design §9)
  it("the keyboard shortcut toggles the panel", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    render(<CookieYesDevtools />);
    expect(panel()).toBeNull();
    await user.keyboard("{Control>}{Shift>}Y{/Shift}{/Control}");
    expect(panel()).not.toBeNull();
    await user.keyboard("{Control>}{Shift>}Y{/Shift}{/Control}");
    expect(panel()).toBeNull();
  });

  // Test 8 (design §9)
  it("open state persists across remounts", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    const { unmount } = render(<CookieYesDevtools />);
    await user.click(trigger());
    expect(panel()).not.toBeNull();
    unmount();
    render(<CookieYesDevtools />);
    expect(panel()).not.toBeNull();
  });

  // Test 9 (design §9)
  it("active tab persists across remounts", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    const { unmount } = render(<CookieYesDevtools />);
    await user.click(trigger());
    await user.click(document.querySelector('[data-cyd-part="tab-region"]') as HTMLElement);
    expect(
      document.querySelector('[data-cyd-part="tab-region"]')?.getAttribute("aria-selected"),
    ).toBe("true");
    unmount();
    render(<CookieYesDevtools />);
    expect(
      document.querySelector('[data-cyd-part="tab-region"]')?.getAttribute("aria-selected"),
    ).toBe("true");
  });

  it("renders null on the server / before a runtime is mounted", () => {
    // No mountCookieOnly() call — _tryGetCookieYes() returns null.
    const { container } = render(<CookieYesDevtools />);
    expect(container.firstChild).toBeNull();
  });
});
