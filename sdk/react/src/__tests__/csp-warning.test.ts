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
