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

describe("EventsTab", () => {
  // Test 18 (design §9)
  it("interleaves event kinds in chronological order", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    installNetworkBlocker(
      { rules: [{ id: "r1", domain: "example.com", category: "analytics" }] },
      () => false,
    );
    await openTab("events");
    await act(async () => {
      runtime.manager.acceptAll(); // a "consent" event
    });
    await act(async () => {
      await fetch("https://example.com/collect").catch(() => undefined); // a "blocked" event
    });
    const kinds = Array.from(document.querySelectorAll('[data-cyd-part="event-row"]')).map((el) =>
      el.getAttribute("data-cyd-kind"),
    );
    expect(kinds).toEqual(["consent", "blocked"]);
  });

  // Test 19 (design §9)
  it("caps the event stream at 200", async () => {
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    installNetworkBlocker(
      { rules: [{ id: "r1", domain: "example.com", category: "analytics" }] },
      () => false,
    );
    await openTab("events");
    await act(async () => {
      for (let i = 0; i < 250; i++) {
        await fetch(`https://example.com/${i}`).catch(() => undefined);
      }
    });
    expect(document.querySelectorAll('[data-cyd-part="event-row"]')).toHaveLength(200);
  });
});
