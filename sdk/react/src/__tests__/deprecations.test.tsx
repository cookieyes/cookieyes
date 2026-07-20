import { _resetOfflineModeWarning } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieYes, initCookieYes, resetCookieYes } from "../runtime.js";
import { clearCookie, mountCookieOnly } from "./test-utils.js";

beforeEach(() => {
  clearCookie();
  _resetOfflineModeWarning();
});
afterEach(() => {
  resetCookieYes();
  clearCookie();
  vi.restoreAllMocks();
});

describe('mode: "offline" deprecation (react)', () => {
  it('warns once about offline when .mode("offline") is used on the builder', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createCookieYes().mode("offline").mount();

    // The builder itself is deprecated (DEVP-2) and `mode: "offline"` is
    // deprecated (DEVP-4). Post-merge both notices fire, each exactly once and
    // independently — neither regresses the other.
    const messages = warn.mock.calls.map((c) => String(c[0]));
    const offlineWarnings = messages.filter((m) => m.includes("cookie-only"));
    const builderWarnings = messages.filter((m) => m.includes("(the builder) is deprecated"));
    expect(offlineWarnings).toHaveLength(1);
    expect(builderWarnings).toHaveLength(1);
  });

  it('warns once about offline via initCookieYes({ mode: "offline" }) with no builder notice', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    // The object-setup path is not deprecated, so `mode: "offline"` is the only
    // notice — proving the offline warning fires exactly once on its own.
    initCookieYes({ mode: "offline", regulation: "GDPR" });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("cookie-only");
  });

  it('does not warn for .mode("cookie-only")', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mountCookieOnly();

    expect(warn).not.toHaveBeenCalled();
  });
});
