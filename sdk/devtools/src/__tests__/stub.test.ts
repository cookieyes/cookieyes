import { describe, expect, it } from "vitest";
import { CookieYesDevtools } from "../stub.js";

/**
 * Test 1 (design §9): the production-path twin of `CookieYesDevtools`.
 * Imported directly from `stub.js`, bypassing conditional-exports
 * resolution — this is the file a production build actually resolves. It is
 * a plain function (not a component tree worth mounting), so it's called
 * directly rather than rendered.
 */
describe("stub CookieYesDevtools", () => {
  it("renders null", () => {
    expect(CookieYesDevtools()).toBeNull();
  });

  it("renders null regardless of props", () => {
    expect(CookieYesDevtools({ position: "top-left", theme: "dark" })).toBeNull();
  });

  it("accepts and ignores a serverRegion prop (same prop shape as the real entry)", () => {
    expect(
      CookieYesDevtools({
        serverRegion: {
          region: "GB",
          drivingSignal: { header: "x-vercel-ip-country", value: "GB" },
          gpc: false,
          forcedRegion: undefined,
        },
      }),
    ).toBeNull();
  });
});
