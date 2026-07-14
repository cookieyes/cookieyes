import { _resetOfflineModeWarning } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCookieYes, resetCookieYes } from "../runtime.js";
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
  it('warns once when .mode("offline") is used', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    createCookieYes().mode("offline").mount();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("cookie-only");
  });

  it('does not warn for .mode("cookie-only")', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    mountCookieOnly();

    expect(warn).not.toHaveBeenCalled();
  });
});
