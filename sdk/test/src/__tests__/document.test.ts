import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CONSENT_COOKIE_NAME,
  clearConsentCookie,
  installDocumentShim,
  isDocumentShimmed,
  restoreDocument,
  writeConsentCookie,
} from "../document.js";

afterEach(() => {
  restoreDocument();
  vi.unstubAllGlobals();
});

/** The jar is only reachable through `globalThis.document` once installed. */
function jar(): { cookie: string } {
  return globalThis.document as unknown as { cookie: string };
}

describe("installDocumentShim", () => {
  it("installs a jar when the environment has no document", () => {
    expect(typeof globalThis.document).toBe("undefined");
    installDocumentShim();
    expect(isDocumentShimmed()).toBe(true);
    expect(typeof globalThis.document).toBe("object");
  });

  it("leaves an existing document (jsdom) completely alone", () => {
    const existing = { cookie: "someone-elses=1" };
    vi.stubGlobal("document", existing);

    installDocumentShim();

    expect(isDocumentShimmed()).toBe(false);
    expect(globalThis.document).toBe(existing as unknown as Document);
  });

  it("is idempotent — a second call does not replace the jar", () => {
    installDocumentShim();
    const first = globalThis.document;
    installDocumentShim();
    expect(globalThis.document).toBe(first);
  });

  it("removes the jar on restore, and restore is safe to repeat", () => {
    installDocumentShim();
    restoreDocument();
    expect(typeof globalThis.document).toBe("undefined");
    expect(isDocumentShimmed()).toBe(false);
    expect(() => restoreDocument()).not.toThrow();
  });
});

describe("the cookie jar", () => {
  it("round-trips a cookie the way document.cookie does", () => {
    installDocumentShim();
    jar().cookie = "a=1; path=/; SameSite=Lax";
    expect(jar().cookie).toBe("a=1");

    jar().cookie = "b=2; path=/";
    expect(jar().cookie).toBe("a=1; b=2");
  });

  it("replaces a cookie of the same name rather than duplicating it", () => {
    installDocumentShim();
    jar().cookie = "a=1";
    jar().cookie = "a=2";
    expect(jar().cookie).toBe("a=2");
  });

  it("deletes on max-age=0 — the path core's clearConsentCookie takes", () => {
    installDocumentShim();
    jar().cookie = "a=1";
    jar().cookie = "a=; max-age=0; path=/";
    expect(jar().cookie).toBe("");
  });

  it("deletes on an expires date in the past", () => {
    installDocumentShim();
    jar().cookie = "a=1";
    jar().cookie = "a=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    expect(jar().cookie).toBe("");
  });

  it("keeps the cookie when expires is in the future or unparseable", () => {
    installDocumentShim();
    jar().cookie = "a=1; expires=Tue, 01 Jan 2999 00:00:00 GMT";
    jar().cookie = "b=2; expires=not-a-date";
    expect(jar().cookie).toBe("a=1; b=2");
  });

  it("keeps the cookie when max-age is positive", () => {
    installDocumentShim();
    jar().cookie = "a=1; max-age=60";
    expect(jar().cookie).toBe("a=1");
  });

  it("ignores writes that carry no name=value pair", () => {
    installDocumentShim();
    jar().cookie = "a=1";
    jar().cookie = "no-equals-sign";
    jar().cookie = "=orphan-value";
    jar().cookie = "";
    expect(jar().cookie).toBe("a=1");
  });

  it("ignores attributes it does not model, including malformed ones", () => {
    installDocumentShim();
    jar().cookie = "a=1; Secure; HttpOnly; path=/";
    expect(jar().cookie).toBe("a=1");
  });
});

describe("consent cookie helpers", () => {
  it("writes an encoded consent cookie and expires it again", () => {
    installDocumentShim();
    writeConsentCookie("consent:yes,analytics:yes");

    expect(jar().cookie).toContain(`${CONSENT_COOKIE_NAME}=`);
    expect(jar().cookie).toContain(encodeURIComponent("consent:yes,analytics:yes"));

    clearConsentCookie();
    expect(jar().cookie).toBe("");
  });

  it("no-ops rather than throwing when there is no document", () => {
    expect(typeof globalThis.document).toBe("undefined");
    expect(() => writeConsentCookie("consent:no")).not.toThrow();
    expect(() => clearConsentCookie()).not.toThrow();
  });
});
