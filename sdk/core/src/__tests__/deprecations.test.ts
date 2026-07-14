import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { _resetOfflineModeWarning } from "../deprecations.js";
import { getOrCreateConsentRuntime, resetConsentRuntime } from "../runtime.js";

function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

beforeEach(() => {
  clearCookie();
  _resetOfflineModeWarning();
});
afterEach(() => {
  resetConsentRuntime();
  clearCookie();
  vi.restoreAllMocks();
});

describe('mode: "offline" deprecation', () => {
  it('warns once, on the console, when mode is "offline"', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    getOrCreateConsentRuntime({ mode: "offline" });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("cookie-only");
  });

  it("does not warn again for a second runtime creation in the same page load", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    getOrCreateConsentRuntime({ mode: "offline" });
    resetConsentRuntime();
    getOrCreateConsentRuntime({ mode: "offline" });

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('never warns for mode: "cookie-only"', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    getOrCreateConsentRuntime({ mode: "cookie-only" });

    expect(warn).not.toHaveBeenCalled();
  });

  it('"cookie-only" and "offline" produce the same runtime shape', () => {
    const cookieOnly = getOrCreateConsentRuntime({ mode: "cookie-only" });
    resetConsentRuntime();
    const offline = getOrCreateConsentRuntime({ mode: "offline" });

    expect(Object.keys(cookieOnly.consentStore.getState())).toEqual(
      Object.keys(offline.consentStore.getState()),
    );
  });
});
