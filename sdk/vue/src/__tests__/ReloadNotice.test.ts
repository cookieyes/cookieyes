import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReloadNotice } from "../presets/ReloadNotice.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, getByText, mountWith, queryByText, unmountAll } from "./test-utils.js";

beforeEach(() => {
  // The built-in vendor list is deprecated and warns; the notice behaves the same.
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
  clearCookie();
  _clearStopHandlers();
});
afterEach(unmountAll);

/** A runtime whose only integration (hotjar) is reload-only. */
const RELOAD_ONLY: CookieYesConfig = {
  mode: "cookie-only",
  regulation: "GDPR",
  builtInIntegrations: [{ vendor: "hotjar" }],
};

async function revoke(): Promise<void> {
  const { manager } = getCookieYes();
  manager.acceptAll();
  await getCookieYes().integrationsReady;
  await flushPromises();
  manager.rejectAll();
  await flushPromises();
}

describe("ReloadNotice", () => {
  it("renders nothing until a reload-only tool's category is revoked", async () => {
    mountWith(RELOAD_ONLY, ReloadNotice);
    await flushPromises();
    expect(document.querySelector("[role=alert]")).toBeNull();
  });

  it("appears (as role=alert) after revoking, with a reload and dismiss button", async () => {
    mountWith(RELOAD_ONLY, ReloadNotice);
    await revoke();

    expect(document.querySelector("[role=alert]")).toBeTruthy();
    expect(getByText("Reload page")).toBeTruthy();
    expect(getByText("Dismiss")).toBeTruthy();
  });

  it("dismiss hides the notice and it does not reappear on a no-op save", async () => {
    mountWith(RELOAD_ONLY, ReloadNotice);
    await revoke();
    expect(document.querySelector("[role=alert]")).not.toBeNull();

    await click(getByText("Dismiss"));
    expect(document.querySelector("[role=alert]")).toBeNull();

    getCookieYes().manager.savePreferences();
    await flushPromises();
    expect(queryByText("Dismiss")).toBeNull();
  });

  it("the reload button calls window.location.reload", async () => {
    const reloadSpy = vi.fn();
    const original = window.location;
    delete (window as unknown as { location?: Location }).location;
    (window as unknown as { location: unknown }).location = { ...original, reload: reloadSpy };
    try {
      mountWith(RELOAD_ONLY, ReloadNotice);
      await revoke();
      await click(getByText("Reload page"));
      expect(reloadSpy).toHaveBeenCalledOnce();
    } finally {
      (window as unknown as { location: Location }).location = original;
    }
  });
});
