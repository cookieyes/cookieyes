import { installNetworkBlocker, uninstallNetworkBlocker } from "@cookieyes/core";
import { initCookieYes } from "@cookieyes/react";
import { act, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../../devtools.js";
import { clearCookie, teardown } from "../test-utils.js";

/** Declared locally — see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

beforeEach(() => {
  clearCookie();
  process.env.NODE_ENV = "development";
  // biome-ignore lint/suspicious/noExplicitAny: matching core's own network-blocker test setup
  (globalThis as any).window.fetch = () => Promise.resolve(new Response(null, { status: 200 }));
});
afterEach(() => {
  cleanup();
  teardown();
  uninstallNetworkBlocker();
});

async function openTab(tab: string) {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(document.querySelector('[data-cyd-part="trigger"]') as HTMLElement);
  await user.click(document.querySelector(`[data-cyd-part="tab-${tab}"]`) as HTMLElement);
  return user;
}

// Test 13 (design §9)
describe("BlockedRequestsTab", () => {
  it("lists a blocked request produced by the network blocker", async () => {
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    installNetworkBlocker(
      { rules: [{ id: "analytics-rule", domain: "example.com", category: "analytics" }] },
      () => false,
    );
    await openTab("blocked");
    await act(async () => {
      await fetch("https://example.com/collect").catch(() => undefined);
    });
    const row = document.querySelector('[data-cyd-part="blocked-request-row"]');
    expect(row?.textContent).toContain("example.com");
    expect(row?.textContent).toContain("analytics-rule");
  });

  // Test 14 (design §9)
  it("caps the list at 200, evicting the oldest first", async () => {
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    installNetworkBlocker(
      { rules: [{ id: "analytics-rule", domain: "example.com", category: "analytics" }] },
      () => false,
    );
    await openTab("blocked");
    await act(async () => {
      for (let i = 0; i < 250; i++) {
        await fetch(`https://example.com/${i}`).catch(() => undefined);
      }
    });
    expect(document.querySelectorAll('[data-cyd-part="blocked-request-row"]')).toHaveLength(200);
  });
});
