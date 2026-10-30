import { describe, expect, it } from "vitest";

// The package must load where there is no browser at all: a server rendering
// the banner shell, a build script, a test runner. This file runs in Node.
describe("@cookieyes/ui in Node", () => {
  it("loads with no window or document", async () => {
    expect(typeof window).toBe("undefined");
    expect(typeof document).toBe("undefined");
    const ui = await import("../index.js");
    expect(typeof ui.renderToString).toBe("function");
  });

  it("makes the browser-only helpers safe no-ops without a document", async () => {
    const ui = await import("../index.js");
    expect(() => ui.activateDeferredStylesheets()).not.toThrow();
    expect(() => ui.warnOnStyleCspViolations()).not.toThrow();
  });
});
