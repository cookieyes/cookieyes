import { describe, expect, it } from "vitest";
import * as realEntry from "../index.js";
import * as stubEntry from "../stub.js";

describe("@cookieyes/devtools exports", () => {
  it("the real entry (index.ts) exports CookieYesDevtools", () => {
    expect(realEntry.CookieYesDevtools).toBeDefined();
    expect(typeof realEntry.CookieYesDevtools).toBe("function");
  });

  it("the stub entry exports a same-named CookieYesDevtools", () => {
    expect(stubEntry.CookieYesDevtools).toBeDefined();
    expect(typeof stubEntry.CookieYesDevtools).toBe("function");
  });

  it("the stub is a distinct, always-null-rendering implementation", () => {
    expect(stubEntry.CookieYesDevtools()).toBeNull();
  });
});
