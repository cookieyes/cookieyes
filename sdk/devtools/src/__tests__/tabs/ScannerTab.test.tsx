import { initCookieYes } from "@cookieyes/react";
import { cleanup, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieYesDevtools } from "../../devtools.js";
import { clearCookie, teardown } from "../test-utils.js";

/** Declared locally — see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

const HOTJAR = "https://static.hotjar.com/c/hotjar-1.js";

beforeEach(() => {
  clearCookie();
  process.env.NODE_ENV = "development";
});
afterEach(() => {
  cleanup();
  teardown();
  document.head.innerHTML = "";
});

function part(name: string): HTMLElement {
  return document.querySelector(`[data-cyd-part="${name}"]`) as HTMLElement;
}

function rows(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-cyd-part="scanner-row"]')];
}

async function openScanner() {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(part("trigger"));
  await user.click(part("tab-scanner"));
  return user;
}

function addScript(src: string): void {
  const el = document.createElement("script");
  el.src = src;
  document.head.appendChild(el);
}

describe("ScannerTab", () => {
  it("lists an unmanaged tracker that loaded before consent as an issue", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    await openScanner();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]?.textContent).toContain("Hotjar");
    expect(rows()[0]?.textContent).toContain("before consent");
    expect(part("scanner-tile-issues").textContent).toContain("1");
  });

  it("shows the issue count on the tab", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    await openScanner();
    await waitFor(() => expect(part("tab-scanner").textContent).toContain("1"));
  });

  it("expands a row with an explanation and a copyable fix", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await user.click(rows()[0] as HTMLElement);
    const detail = part("scanner-detail");
    expect(detail.textContent).toContain("possible pre-consent load");
    expect(detail.querySelector("pre")?.textContent).toContain("customScript({");
  });

  it("does not flag a script the SDK registered and injected after consent", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    runtime.registerScript({ id: "hj", src: HOTJAR, category: "analytics" });
    const user = await openScanner();
    await new Promise((r) => setTimeout(r, 5));
    runtime.manager.acceptAll();
    await user.click(part("scanner-filter-managed"));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]?.getAttribute("data-cyd-status")).toBe("managed");
    await user.click(part("scanner-filter-issues"));
    expect(part("scanner-empty")).not.toBeNull();
  });

  it("still flags a managed script that something put on the page before consent", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    runtime.registerScript({ id: "hj", src: HOTJAR, category: "analytics" });
    addScript(HOTJAR);
    await openScanner();
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]?.getAttribute("data-cyd-status")).toBe("managed");
    expect(rows()[0]?.textContent).toContain("before consent");
  });

  it("does not flag a tracker that loaded after its category was granted", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    runtime.manager.acceptAll();
    await new Promise((r) => setTimeout(r, 5));
    addScript(HOTJAR);
    await user.click(part("scanner-filter-unmanaged"));
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]?.textContent).not.toContain("before consent");
  });

  it("dismisses a finding, remembers it, and can show it again", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await user.click(rows()[0] as HTMLElement);
    await user.click(part("scanner-dismiss"));
    expect(rows()).toHaveLength(0);
    expect(window.localStorage.getItem("cyd:scanner-dismissed")).toContain("hotjar");
    await user.click(part("scanner-show-dismissed"));
    expect(rows()).toHaveLength(1);
  });

  it("copies the fix snippet", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await user.click(rows()[0] as HTMLElement);
    await user.click(part("scanner-copy"));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("customScript({"));
    await waitFor(() => expect(part("scanner-copy").textContent).toContain("Copied"));
  });

  it("lists vendor cookies under Cookies & storage and explains who set them", async () => {
    document.cookie = "_hjSessionUser_1=x; path=/";
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    await user.click(part("scanner-tile-stores"));
    const row = await waitFor(() => {
      const found = rows().find(
        (r) => r.getAttribute("data-cyd-key") === "cookie:_hjSessionUser_1",
      );
      expect(found).toBeDefined();
      return found as HTMLElement;
    });
    await user.click(row);
    expect(part("scanner-detail").textContent).toContain("Hotjar");
    document.cookie = "_hjSessionUser_1=; max-age=0; path=/";
  });

  it("flags a vendor cookie still set after its category was withdrawn", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    runtime.manager.acceptAll();
    document.cookie = "_hjSessionUser_1=x; path=/";
    await user.click(part("scanner-rescan"));
    runtime.manager.rejectAll();
    await user.click(part("scanner-rescan"));
    const row = await waitFor(() => {
      const found = rows().find((r) => r.textContent?.includes("after withdrawal"));
      expect(found).toBeDefined();
      return found as HTMLElement;
    });
    await user.click(row);
    expect(part("scanner-detail").textContent).toContain("withdrawn");
    document.cookie = "_hjSessionUser_1=; max-age=0; path=/";
  });

  it("explains unclassified hosts and searches by host", async () => {
    addScript("https://cdn.example.org/widget.js");
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    await user.click(part("scanner-filter-all"));
    await waitFor(() => expect(rows().length).toBeGreaterThanOrEqual(2));
    await user.type(part("scanner-search"), "example.org");
    expect(rows()).toHaveLength(1);
    await user.click(rows()[0] as HTMLElement);
    expect(part("scanner-detail").textContent).toContain("Not in the vendor table");
    await user.clear(part("scanner-search"));
    await user.type(part("scanner-search"), "nothing-like-this");
    expect(part("scanner-empty").textContent).toContain("Nothing matches");
  });

  it("exports the findings as JSON", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const createObjectURL = vi.fn(() => "blob:scan");
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
    const user = await openScanner();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await user.click(part("scanner-export"));
    expect(createObjectURL).toHaveBeenCalled();
  });

  it("restores a dismissed finding", async () => {
    addScript(HOTJAR);
    initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    await waitFor(() => expect(rows()).toHaveLength(1));
    await user.click(rows()[0] as HTMLElement);
    await user.click(part("scanner-dismiss"));
    // The row stays expanded, so its Restore button is there once dismissed rows show.
    await user.click(part("scanner-show-dismissed"));
    await user.click(part("scanner-restore"));
    expect(window.localStorage.getItem("cyd:scanner-dismissed")).toBe("[]");
    await user.click(part("scanner-show-dismissed"));
    expect(rows()).toHaveLength(1);
  });

  it("flags what loads after a reset, but not what loaded while consent was granted", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    runtime.manager.acceptAll();
    await new Promise((r) => setTimeout(r, 5));
    addScript(HOTJAR);
    await new Promise((r) => setTimeout(r, 5));
    runtime.manager.resetConsent();
    await new Promise((r) => setTimeout(r, 5));
    addScript("https://cdn.mxpnl.com/libs/mixpanel.js");
    await user.click(part("scanner-filter-unmanaged"));
    await waitFor(() => expect(rows()).toHaveLength(2));
    const byName = (name: string) => rows().find((r) => r.textContent?.includes(name));
    expect(byName("Hotjar")?.textContent).not.toContain("withdrawal");
    expect(byName("Mixpanel")?.textContent).toContain("after withdrawal");
  });

  it("flags a cookie set just before consent, even before the poll has seen it", async () => {
    const runtime = initCookieYes({ mode: "cookie-only", regulation: "GDPR" });
    const user = await openScanner();
    // Set and accepted within one poll interval: only the sync at the consent
    // change can tell that the cookie came first.
    document.cookie = "_hjSessionUser_9=x; path=/";
    runtime.manager.acceptAll();
    await user.click(part("scanner-filter-issues"));
    await waitFor(() =>
      expect(rows().some((r) => r.getAttribute("data-cyd-key") === "cookie:_hjSessionUser_9")).toBe(
        true,
      ),
    );
    const row = rows().find((r) => r.getAttribute("data-cyd-key") === "cookie:_hjSessionUser_9");
    expect(row?.textContent).toContain("before consent");
    document.cookie = "_hjSessionUser_9=; max-age=0; path=/";
  });
});
