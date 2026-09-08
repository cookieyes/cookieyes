/// <reference types="node" />
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  _resetBuiltInIntegrationsWarning,
  _resetOfflineModeWarning,
  _warnBuiltInIntegrationsDeprecated,
} from "../deprecations.js";
import { getOrCreateConsentRuntime, resetConsentRuntime } from "../runtime.js";

function clearCookie(): void {
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
}

beforeEach(() => {
  clearCookie();
  _resetOfflineModeWarning();
  _resetBuiltInIntegrationsWarning();
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

/**
 * These warnings are stripped from production bundles, which saves 224 bytes of
 * gzip in core and 175 in the interface layer (tools/size/README.md).
 *
 * The saving depends entirely on the guard being written as the literal
 * `process.env.NODE_ENV === "production"` that bundlers replace. Two forms that
 * read as equivalent — hoisting it into a shared `const`, or wrapping it in a
 * `typeof process` check — both leave every warning string in the bundle, and
 * both were measured doing exactly that before this test existed. Nothing about
 * the source looks wrong when it regresses, so assert the behaviour here and
 * let the size budget catch the bytes.
 */
describe("production builds ship no deprecation warnings", () => {
  const original = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  it('is silent for mode: "offline" when NODE_ENV is production', () => {
    process.env.NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    getOrCreateConsentRuntime({ mode: "offline" });

    expect(warn).not.toHaveBeenCalled();
  });

  it("is silent for builtInIntegrations when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    _warnBuiltInIntegrationsDeprecated();

    expect(warn).not.toHaveBeenCalled();
  });

  it("still warns in every other environment, so the guard is not simply off", () => {
    process.env.NODE_ENV = "development";
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    _warnBuiltInIntegrationsDeprecated();

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
