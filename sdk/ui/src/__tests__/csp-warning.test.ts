// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { warnOnStyleCspViolations } from "../styles/csp-warning.js";

function dispatchViolation(violatedDirective: string): void {
  const event = new Event("securitypolicyviolation");
  Object.defineProperty(event, "violatedDirective", { value: violatedDirective });
  document.dispatchEvent(event);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("warnOnStyleCspViolations", () => {
  it("warns when a style-src violation fires", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnStyleCspViolations();

    dispatchViolation("style-src-elem");

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toContain("blocked by your Content-Security-Policy");
  });

  it("ignores violations for other directives", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    warnOnStyleCspViolations();

    dispatchViolation("script-src");

    expect(warn).not.toHaveBeenCalled();
  });
});

describe("warnOnStyleCspViolations cleanup", () => {
  it("stops listening once the returned cleanup runs", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    // Earlier tests in this file leave their listeners attached, so count the
    // difference this one cleanup makes.
    const stop = warnOnStyleCspViolations();
    dispatchViolation("style-src");
    const attached = warn.mock.calls.length;
    warn.mockClear();
    stop();
    dispatchViolation("style-src");
    expect(warn.mock.calls.length).toBe(attached - 1);
  });
});
