import { initCookieYes } from "@cookieyes/react";
import { act, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../../devtools.js";
import { clearCookie, teardown } from "../test-utils.js";

type WindowWithDataLayer = Window & { dataLayer?: unknown[] | undefined };

beforeEach(() => {
  clearCookie();
  (window as WindowWithDataLayer).dataLayer = [];
});
afterEach(() => {
  cleanup();
  teardown();
  (window as WindowWithDataLayer).dataLayer = undefined;
});

async function openTab(tab: string) {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(document.querySelector('[data-cyd-part="trigger"]') as HTMLElement);
  await user.click(document.querySelector(`[data-cyd-part="tab-${tab}"]`) as HTMLElement);
  return user;
}

describe("GoogleConsentModeTab", () => {
  // Test 15 (design §9)
  it("shows the current 7 signals matching the committed categories", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    await act(async () => {
      runtime.manager.acceptAll();
    });
    await openTab("gcm");
    expect(
      document.querySelector('[data-cyd-part="gcm-signal-analytics_storage"]')?.textContent,
    ).toContain("granted");
    expect(
      document.querySelector('[data-cyd-part="gcm-signal-security_storage"]')?.textContent,
    ).toContain("granted");
  });

  // Test 16 (design §9)
  it("records the server-rendered default (oldest row) even though the panel mounted after it ran", async () => {
    // Simulates the <GoogleConsentMode/> inline script having already run
    // before this module's hook registry existed to observe it.
    (window as WindowWithDataLayer).dataLayer = [
      ["consent", "default", { ad_storage: "denied", security_storage: "granted" }],
    ];
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    await openTab("gcm");
    const rows = document.querySelectorAll('[data-cyd-part="gcm-record-row"]');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.querySelector('[data-cyd-part="gcm-record-source"]')?.textContent).toBe(
      "server-snippet",
    );
  });

  // Test 17 (design §9)
  it("appends a timestamped record on every update", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    await openTab("gcm");
    const before = document.querySelectorAll('[data-cyd-part="gcm-record-row"]').length;
    await act(async () => {
      runtime.manager.rejectAll();
    });
    const rows = document.querySelectorAll('[data-cyd-part="gcm-record-row"]');
    expect(rows.length).toBe(before + 1);
    expect(
      rows[rows.length - 1]?.querySelector('[data-cyd-part="gcm-record-trigger"]')?.textContent,
    ).toBe("update");
  });
});
