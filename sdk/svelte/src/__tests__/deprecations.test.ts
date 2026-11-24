import { _resetOfflineModeWarning } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearCookie, mountWith, unmountAll } from "./test-utils.js";

beforeEach(() => {
  clearCookie();
  _resetOfflineModeWarning();
});
afterEach(unmountAll);

describe('mode: "offline" deprecation (svelte)', () => {
  it("warns once about offline through the provider", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mountWith({ mode: "offline", regulation: "GDPR" });
    const offline = warn.mock.calls.filter((c) => String(c[0]).includes("cookie-only"));
    expect(offline).toHaveLength(1);
  });

  it('does not warn for mode "cookie-only"', () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mountWith({ mode: "cookie-only", regulation: "GDPR" });
    expect(warn).not.toHaveBeenCalled();
  });
});
