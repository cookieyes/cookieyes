import { afterEach, describe, expect, it } from "vitest";
import { safeCall } from "../safe-call.js";

type W = { analytics?: unknown };
const w = () => window as unknown as W;
afterEach(() => {
  w().analytics = undefined;
});

describe("safeCall()", () => {
  it("calls the method when the global object and method exist", () => {
    const calls: unknown[][] = [];
    w().analytics = { track: (...a: unknown[]) => calls.push(a) };
    safeCall("analytics", "track", "Signup", { plan: "pro" });
    expect(calls).toEqual([["Signup", { plan: "pro" }]]);
  });

  it("is a no-op when the global is missing (e.g. Segment removed on revoke)", () => {
    w().analytics = undefined;
    expect(() => safeCall("analytics", "track", "Signup")).not.toThrow();
  });

  it("is a no-op when the method is missing", () => {
    w().analytics = {};
    expect(() => safeCall("analytics", "track", "Signup")).not.toThrow();
  });
});
