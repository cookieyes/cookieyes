import type { Integration } from "@cookieyes/core";
import { initCookieYes } from "@cookieyes/react";
import { act, cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../../devtools.js";
import { clearCookie, teardown } from "../test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

function seg(): Integration {
  return {
    id: "seg",
    category: "analytics",
    version: 1,
    load: "afterConsent",
    onRevoke: "keep",
    setup: () => undefined,
  };
}

async function openTab(tab: string) {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(document.querySelector('[data-cyd-part="trigger"]') as HTMLElement);
  await user.click(document.querySelector(`[data-cyd-part="tab-${tab}"]`) as HTMLElement);
  return user;
}

// Test 12 (design §9)
describe("IntegrationsTab", () => {
  it("lists configured integrations, updating status live as consent is granted", async () => {
    const runtime = initCookieYes({
      mode: "cookie-only",
      regulation: "GDPR",
      integrations: [seg()],
    });
    await act(async () => {
      await runtime.integrationsReady;
    });
    await openTab("integrations");
    const row = document.querySelector('[data-cyd-part="integration-row-seg"]');
    expect(row).not.toBeNull();
    expect(
      document.querySelector('[data-cyd-part="integration-row-seg-status"]')?.textContent,
    ).toBe("idle");

    await act(async () => {
      runtime.manager.acceptAll();
      await Promise.resolve();
    });

    expect(
      document.querySelector('[data-cyd-part="integration-row-seg-status"]')?.textContent,
    ).toBe("active");
  });

  it("shows an empty state when nothing is configured", async () => {
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    await openTab("integrations");
    expect(document.querySelector('[data-cyd-part="integrations-tab"]')?.textContent).toContain(
      "No integrations configured",
    );
  });
});
