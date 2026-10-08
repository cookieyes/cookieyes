import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getServerConsent` is the Next.js wrapper around core's `readServerConsent`:
 * its only job is turning the App Router's cookie store into a `Cookie` header
 * string. `next/headers` needs a real request context, so it is mocked here —
 * the cookie-parsing behaviour itself is covered in core's
 * `server-consent.test.ts`.
 */

const cookieStore = { entries: [] as { name: string; value: string }[] };
const headerStore = { values: {} as Record<string, string> };

vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => cookieStore.entries,
  }),
  headers: async () => ({
    get: (name: string) => headerStore.values[name.toLowerCase()] ?? null,
  }),
}));

const CONSENT = encodeURIComponent(
  [
    "consentid:abc",
    "consent:yes",
    "action:yes",
    "necessary:yes",
    "functional:yes",
    "analytics:yes",
    "performance:no",
    "advertisement:no",
    "lastRenewedDate:1700000000000",
  ].join(","),
);

beforeEach(() => {
  cookieStore.entries = [];
  headerStore.values = {};
});

describe("getServerConsent", () => {
  it("returns null when the request carries no cookies", async () => {
    const { getServerConsent } = await import("../server.js");
    await expect(getServerConsent()).resolves.toBeNull();
  });

  it("returns null when the consent cookie is absent", async () => {
    cookieStore.entries = [{ name: "session", value: "abc" }];
    const { getServerConsent } = await import("../server.js");
    await expect(getServerConsent()).resolves.toBeNull();
  });

  it("returns the stored decision for a returning visitor", async () => {
    cookieStore.entries = [{ name: "cookieyes-consent", value: CONSENT }];
    const { getServerConsent } = await import("../server.js");
    const snap = await getServerConsent({ regulation: "GDPR" });
    expect(snap).not.toBeNull();
    expect(snap?.hasActed).toBe(true);
    expect(snap?.categories.analytics).toBe(true);
    expect(snap?.categories.advertisement).toBe(false);
  });

  it("finds the consent cookie among several others", async () => {
    cookieStore.entries = [
      { name: "session", value: "abc" },
      { name: "cookieyes-consent", value: CONSENT },
      { name: "_ga", value: "GA1.1.123" },
    ];
    const { getServerConsent } = await import("../server.js");
    expect((await getServerConsent())?.hasActed).toBe(true);
  });

  it("passes the taxonomy through, so a mismatch re-requests consent", async () => {
    cookieStore.entries = [{ name: "cookieyes-consent", value: CONSENT }];
    const { getServerConsent } = await import("../server.js");
    const snap = await getServerConsent({
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
    });
    // Stored against the built-in five, read against a custom taxonomy → stale.
    expect(snap).toBeNull();
  });

  it("works with no options at all", async () => {
    cookieStore.entries = [{ name: "cookieyes-consent", value: CONSENT }];
    const { getServerConsent } = await import("../server.js");
    await expect(getServerConsent()).resolves.not.toBeNull();
  });
});

describe("getServerRegion", () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  });

  it("reads the region and driving signal from geo headers", async () => {
    headerStore.values["x-vercel-ip-country"] = "US";
    headerStore.values["x-vercel-ip-country-region"] = "CA";
    const { getServerRegion } = await import("../server.js");
    const info = await getServerRegion();
    expect(info.region).toBe("US-CA");
    expect(info.drivingSignal).toEqual({ header: "x-vercel-ip-country-region", value: "CA" });
  });

  it("falls back to the country header alone when there's no region header", async () => {
    headerStore.values["cf-ipcountry"] = "GB";
    const { getServerRegion } = await import("../server.js");
    const info = await getServerRegion();
    expect(info.region).toBe("GB");
    expect(info.drivingSignal).toEqual({ header: "cf-ipcountry", value: "GB" });
  });

  it("has no driving signal when no known geo header is present", async () => {
    const { getServerRegion } = await import("../server.js");
    const info = await getServerRegion();
    expect(info.region).toBeUndefined();
    expect(info.drivingSignal).toBeUndefined();
  });

  it("reports the Sec-GPC signal", async () => {
    headerStore.values["sec-gpc"] = "1";
    const { getServerRegion } = await import("../server.js");
    expect((await getServerRegion()).gpc).toBe(true);
  });

  it("gpc is false when Sec-GPC is absent", async () => {
    const { getServerRegion } = await import("../server.js");
    expect((await getServerRegion()).gpc).toBe(false);
  });

  it("has no forced region when the __cyd_region cookie is absent", async () => {
    const { getServerRegion } = await import("../server.js");
    expect((await getServerRegion()).forcedRegion).toBeUndefined();
  });

  it("reads a forced region from the __cyd_region cookie in development", async () => {
    process.env.NODE_ENV = "development";
    cookieStore.entries = [{ name: "__cyd_region", value: "DE" }];
    const { getServerRegion } = await import("../server.js");
    expect((await getServerRegion()).forcedRegion).toBe("DE");
  });

  it("never reads a forced region in production", async () => {
    process.env.NODE_ENV = "production";
    cookieStore.entries = [{ name: "__cyd_region", value: "DE" }];
    const { getServerRegion } = await import("../server.js");
    expect((await getServerRegion()).forcedRegion).toBeUndefined();
  });
});
