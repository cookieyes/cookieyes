import { afterEach, describe, expect, it, vi } from "vitest";
import { cookieDomains, cookieExpiries, deleteCookie } from "../cookies.js";

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

describe("cookieExpiries()", () => {
  it("expires host-only, then on each parent domain", () => {
    expect(cookieExpiries("_fbp", "www.shop.example.com")).toEqual([
      "_fbp=; max-age=0; path=/",
      "_fbp=; max-age=0; path=/; domain=.www.shop.example.com",
      "_fbp=; max-age=0; path=/; domain=.shop.example.com",
      "_fbp=; max-age=0; path=/; domain=.example.com",
    ]);
  });

  it("writes only the host-only expiry when there is no parent domain", () => {
    expect(cookieExpiries("_fbp", "localhost")).toEqual(["_fbp=; max-age=0; path=/"]);
  });
});

describe("deleteCookie()", () => {
  it("writes every expiry string to document.cookie", () => {
    const writes: string[] = [];
    vi.spyOn(document, "cookie", "set").mockImplementation((v: string) => writes.push(v));
    deleteCookie("_fbp");
    // In jsdom the host is localhost, so this is the host-only expiry; the full
    // domain list is asserted by cookieExpiries() above.
    expect(writes).toEqual(cookieExpiries("_fbp", location.hostname));
  });
});
