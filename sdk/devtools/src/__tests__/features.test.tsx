import { getCookieYes } from "@cookieyes/react";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CookieYesDevtools } from "../devtools.js";
import { downloadJson, timestampedFilename } from "../lib/download-json.js";
import { clearCookie, mountCookieOnly, teardown } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
  vi.restoreAllMocks();
});

const part = (name: string) => document.querySelector(`[data-cyd-part="${name}"]`) as HTMLElement;

async function openTab(tab: string) {
  const user = userEvent.setup();
  render(<CookieYesDevtools />);
  await user.click(part("trigger"));
  await user.click(part(`tab-${tab}`));
  return user;
}

function stubDownloads() {
  const createObjectURL = vi.fn(() => "blob:test");
  Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
  return { createObjectURL, click };
}

describe("Consent tab controls", () => {
  it("toggles a category (unsaved), then saves it", async () => {
    mountCookieOnly("GDPR");
    const user = await openTab("consent");
    expect(part("consent-save").hasAttribute("disabled")).toBe(true);

    await user.click(part("consent-row-analytics-toggle"));
    expect(part("consent-row-analytics-working").textContent).toBe("true");
    expect(part("consent-row-analytics-committed").textContent).toBe("false");
    expect(part("consent-unsaved").textContent).toBe("1 unsaved change");

    await user.click(part("consent-save"));
    expect(part("consent-row-analytics-committed").textContent).toBe("true");
    expect(part("consent-unsaved").textContent).toBe("Working matches committed");
  });

  it("accepts and rejects all from the footer", async () => {
    mountCookieOnly("GDPR");
    const user = await openTab("consent");
    await user.click(part("consent-accept-all"));
    expect(getCookieYes().getSnapshot().committedCategories.advertisement).toBe(true);
    await user.click(part("consent-reject-all"));
    expect(getCookieYes().getSnapshot().committedCategories.advertisement).toBe(false);
  });

  it("locks the required category", async () => {
    mountCookieOnly("GDPR");
    await openTab("consent");
    expect(part("consent-row-necessary-toggle").hasAttribute("disabled")).toBe(true);
  });
});

describe("Actions tab", () => {
  /**
   * Stands in for a mounted `<CookiePreferences />` / `<CookieOptOut />`: renders
   * each preset's root marker while the runtime says that dialog is open.
   */
  function mountStandInDialogs(): () => void {
    const runtime = getCookieYes();
    const sync = () => {
      const snap = runtime.getSnapshot();
      for (const [open, partName] of [
        [snap.isPreferencesOpen, "dialog"],
        [snap.isOptOutOpen, "optout"],
      ] as const) {
        const existing = document.querySelector(`[data-cy-part="${partName}"]`);
        if (open && !existing) {
          const el = document.createElement("div");
          el.setAttribute("data-cy-part", partName);
          document.body.appendChild(el);
        } else if (!open) existing?.remove();
      }
    };
    const unsubscribe = runtime.subscribe(sync);
    return () => {
      unsubscribe();
      for (const el of document.querySelectorAll(
        '[data-cy-part="dialog"], [data-cy-part="optout"]',
      )) {
        el.remove();
      }
    };
  }

  it("opens a mounted preferences or opt-out dialog and closes the panel", async () => {
    mountCookieOnly("CCPA");
    const stop = mountStandInDialogs();
    const user = await openTab("actions");
    await user.click(part("action-open-preferences"));
    await waitFor(() => expect(part("panel")).toBeNull());
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);

    act(() => getCookieYes().manager.hidePreferences());
    await user.click(part("trigger"));
    await user.click(part("action-open-optout"));
    await waitFor(() => expect(part("panel")).toBeNull());
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(true);
    stop();
  });

  it("never leaves both dialogs open: opening one closes the other", async () => {
    mountCookieOnly("CCPA");
    const stop = mountStandInDialogs();
    try {
      const user = await openTab("actions");
      await user.click(part("action-open-preferences"));
      await waitFor(() => expect(part("panel")).toBeNull());

      await user.click(part("trigger"));
      await user.click(part("action-open-optout"));
      await waitFor(() => expect(part("panel")).toBeNull());
      expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(true);
      expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(false);

      await user.click(part("trigger"));
      await user.click(part("action-open-preferences"));
      await waitFor(() => expect(part("panel")).toBeNull());
      expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);
      expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(false);
    } finally {
      stop();
    }
  });

  it("uses the regulation a CookieYesProvider resolved over the runtime's startup value", async () => {
    mountCookieOnly("GDPR");
    // What <CookieYesProvider regulation="CCPA"> reports in development.
    const g = globalThis as { __COOKIEYES_DEVTOOLS__?: unknown[] };
    g.__COOKIEYES_DEVTOOLS__ ??= Object.assign([], { v: 1 });
    const queue = g.__COOKIEYES_DEVTOOLS__;
    queue.push({
      k: "p",
      t: Date.now(),
      d: { region: undefined, regulation: "CCPA", source: "manual", confidence: "high" },
    });
    await openTab("actions");
    expect(part("action-open-optout").hasAttribute("disabled")).toBe(false);
    expect(document.querySelector(".cyd-panel-footer")?.textContent).toContain("CCPA");
  });

  it("offers opt-out only under CCPA, and says how to test it otherwise", async () => {
    mountCookieOnly("GDPR");
    await openTab("actions");
    expect(part("action-open-optout").hasAttribute("disabled")).toBe(true);
    expect(part("action-open-optout-hint").textContent).toContain("CCPA only");
    expect(part("action-open-preferences").hasAttribute("disabled")).toBe(false);
  });

  it("doesn't mistake a site modal that was already open for the missing dialog", async () => {
    mountCookieOnly("GDPR");
    const siteModal = document.createElement("div");
    siteModal.setAttribute("role", "dialog");
    document.body.appendChild(siteModal);
    try {
      const user = await openTab("actions");
      await user.click(part("action-open-preferences"));
      await waitFor(() => expect(part("action-dialog-missing")).not.toBeNull());
      expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(false);
    } finally {
      siteModal.remove();
    }
  });

  it("undoes the open when nothing renders the dialog, so the banner isn't left hidden", async () => {
    mountCookieOnly("CCPA");
    const user = await openTab("actions");
    await user.click(part("action-open-optout"));
    await waitFor(() => expect(part("action-dialog-missing")).not.toBeNull());
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(false);
    expect(part("panel")).not.toBeNull();
    expect(part("action-dialog-missing").textContent).toContain("<CookieOptOut />");

    await user.click(part("action-open-preferences"));
    await waitFor(() =>
      expect(part("action-dialog-missing").textContent).toContain("<CookiePreferences />"),
    );
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(false);
  });

  it("exports a debug bundle and copies state", async () => {
    mountCookieOnly("GDPR");
    const user = await openTab("actions");
    const { createObjectURL, click } = stubDownloads();
    await user.click(part("action-export-debug"));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    await user.click(part("action-copy-state"));
    await vi.waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const bundle = JSON.parse(writeText.mock.calls[0]?.[0] as string);
    expect(bundle).toHaveProperty("consent.regulation", "GDPR");
    expect(bundle).toHaveProperty("region.decision");
    expect(bundle).toHaveProperty("googleConsentMode.current");
  });

  it("resets consent", async () => {
    mountCookieOnly("GDPR");
    const user = await openTab("actions");
    act(() => getCookieYes().manager.acceptAll());
    await user.click(part("reset-consent"));
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });
});

describe("Events tab", () => {
  it("filters, searches, expands a payload, exports and clears", async () => {
    mountCookieOnly("GDPR");
    const user = await openTab("events");
    act(() => getCookieYes().manager.acceptAll());
    act(() => getCookieYes().manager.rejectAll());

    const rows = () => document.querySelectorAll('[data-cyd-part="event-row"]');
    expect(rows().length).toBeGreaterThanOrEqual(2);

    await user.click(part("events-filter-blocked"));
    expect(rows()).toHaveLength(0);
    expect(part("events-tab").textContent).toContain("No events match.");
    await user.click(part("events-filter-consent"));
    expect(rows().length).toBeGreaterThanOrEqual(2);

    await user.type(part("events-search"), "advertisement");
    expect(rows().length).toBeGreaterThanOrEqual(1);
    await user.clear(part("events-search"));
    await user.type(part("events-search"), "no-such-thing");
    expect(rows()).toHaveLength(0);
    await user.clear(part("events-search"));

    await user.click(rows()[0] as HTMLElement);
    expect(JSON.parse(part("event-payload").textContent ?? "")).toHaveProperty("kind", "consent");
    await user.click(rows()[0] as HTMLElement);
    expect(part("event-payload")).toBeNull();

    const { createObjectURL } = stubDownloads();
    await user.click(part("events-export"));
    expect(createObjectURL).toHaveBeenCalledTimes(1);

    await user.click(part("events-clear"));
    expect(part("events-tab").textContent).toContain("No events recorded yet.");
    expect(window.sessionStorage.getItem("cyd:events")).toBe("[]");
  });

  it("keeps events across a remount (page reload) and marks them as previous", async () => {
    mountCookieOnly("GDPR");
    const user = userEvent.setup();
    const first = render(<CookieYesDevtools />);
    await user.click(part("trigger"));
    await user.click(part("tab-events"));
    act(() => getCookieYes().manager.acceptAll());
    await vi.waitFor(() =>
      expect(JSON.parse(window.sessionStorage.getItem("cyd:events") ?? "[]").length).toBe(1),
    );
    first.unmount();

    render(<CookieYesDevtools />);
    const row = part("event-row");
    expect(row.className).toContain("cyd-list-row-previous");
    act(() => getCookieYes().manager.rejectAll());
    expect(part("events-tab").textContent).toContain("Page reloaded");
  });
});

describe("Integrations tab", () => {
  it("summarises statuses and filters rows", async () => {
    mountCookieOnly("GDPR");
    const runtime = getCookieYes();
    vi.spyOn(runtime, "getIntegrations").mockReturnValue(
      ["a", "b", "c", "d", "e"].map((id, i) => ({
        id,
        category: i === 0 ? ["analytics", "advertisement"] : "analytics",
        load: i === 0 ? ("immediately" as const) : ("afterConsent" as const),
        onRevoke: "remove" as const,
        status: i < 2 ? ("active" as const) : ("idle" as const),
      })),
    );
    const user = await openTab("integrations");
    expect(part("integrations-summary").textContent).toBe("2 active3 idle");
    expect(part("integration-row-a").textContent).toContain("analytics + advertisement");
    await user.type(
      document.querySelector('input[aria-label="Filter integrations"]') as HTMLElement,
      "zzz",
    );
    expect(part("integrations-tab").textContent).toContain("No integration matches");
  });
});

describe("Trigger drag to snap", () => {
  it("snaps to the nearest corner and does not toggle the panel", () => {
    mountCookieOnly("GDPR");
    render(<CookieYesDevtools />);
    const trigger = part("trigger");
    Object.assign(window, { innerWidth: 1000, innerHeight: 800 });
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0, clientX: 950, clientY: 750 });
    fireEvent.pointerMove(trigger, { pointerId: 1, clientX: 400, clientY: 300 });
    expect(trigger.className).toContain("cyd-trigger-dragging");
    fireEvent.pointerMove(trigger, { pointerId: 1, clientX: 60, clientY: 50 });
    fireEvent.pointerUp(trigger, { pointerId: 1, clientX: 60, clientY: 50 });
    fireEvent.click(trigger);
    expect(part("trigger").className).toContain("cyd-pos-top-left");
    expect(part("panel")).toBeNull();
    expect(JSON.parse(window.localStorage.getItem("cyd:ui") ?? "{}").position).toBe("top-left");
  });

  it("a short press is still a click", () => {
    mountCookieOnly("GDPR");
    render(<CookieYesDevtools />);
    const trigger = part("trigger");
    fireEvent.pointerDown(trigger, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(trigger, { pointerId: 1, clientX: 12, clientY: 11 });
    fireEvent.pointerUp(trigger, { pointerId: 1, clientX: 12, clientY: 11 });
    fireEvent.click(trigger);
    expect(part("panel")).not.toBeNull();
  });
});

describe("download helpers", () => {
  it("builds a sortable, filesystem-safe name", () => {
    expect(timestampedFilename("x", new Date("2026-09-29T11:20:05.123Z"))).toBe(
      "x-2026-09-29T11-20-05.json",
    );
  });

  it("returns false when the download can't be created", () => {
    Object.assign(URL, {
      createObjectURL: () => {
        throw new Error("nope");
      },
    });
    expect(downloadJson("x.json", {})).toBe(false);
  });
});
