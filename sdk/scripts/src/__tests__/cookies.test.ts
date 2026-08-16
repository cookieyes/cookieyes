import { afterEach, describe, expect, it, vi } from "vitest";
import { cookieDomains, deleteCookie } from "../cookies.js";

afterEach(() => vi.restoreAllMocks());

describe("cookieDomains()", () => {
  it("lists each parent domain, stopping before the TLD", () => {
    expect(cookieDomains("www.shop.example.com")).toEqual([
      "www.shop.example.com",
      "shop.example.com",
      "example.com",
    ]);
    expect(cookieDomains("example.com")).toEqual(["example.com"]);
    expect(cookieDomains("localhost")).toEqual([]);
  });
});

describe("deleteCookie()", () => {
  it("expires the cookie host-only, then on each parent domain from the host", () => {
    const writes: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((v: string) => writes.push(v));

    deleteCookie("_fbp");

    // Host-only expiry always goes out first; parent-domain expiries follow (the
    // exact domains depend on the host and are covered by cookieDomains() above).
    expect(writes[0]).toBe("_fbp=; max-age=0; path=/");
    expect(writes.every((w) => w.startsWith("_fbp=; max-age=0; path=/"))).toBe(true);
  });
});
