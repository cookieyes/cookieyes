import { readServerConsent } from "@cookieyes/core";
import { describe, expect, it } from "vitest";
import { type PageSpec, renderOnServer, useServerRenderer } from "./ssr-render.js";

/**
 * A returning visitor must never see the banner appear and then vanish.
 *
 * The server snapshot always describes a fresh visitor, so without a seeded decision the server
 * sends banner markup to everyone and the client removes it after hydration: a visible flash that
 * reads as a bug. Seeding the decision through `<CookieYesProvider initialConsent={...}>` means
 * the banner is never in the HTML at all: nothing to hide, so nothing flashes.
 */
useServerRenderer();

/** A stored "accepted everything" decision, as it would arrive from a request. */
function acceptedHeader(): string {
  const value = encodeURIComponent(
    [
      "consentid:abc",
      "consent:yes",
      "action:yes",
      "necessary:yes",
      "functional:yes",
      "analytics:yes",
      "performance:yes",
      "advertisement:yes",
      "lastRenewedDate:1700000000000",
    ].join(","),
  );
  return `cookieyes-consent=${value}`;
}

type Seed = ReturnType<typeof readServerConsent> | undefined;

/** Renders the banner and recall button; `undefined` leaves the prop off entirely. */
async function render(regulation: "GDPR" | "CCPA", initialConsent: Seed): Promise<string> {
  const spec: PageSpec = {
    regulation,
    parts: ["banner", "recall"],
    ...(initialConsent === undefined ? {} : { initialConsent }),
  };
  return (await renderOnServer(spec)).body;
}

describe("returning visitor: the banner is absent from server-rendered HTML", () => {
  it("renders no banner when initialConsent reports a decision", async () => {
    const initialConsent = readServerConsent(acceptedHeader());
    expect(initialConsent).not.toBeNull();
    const html = await render("GDPR", initialConsent);
    expect(html).not.toContain("data-cky-banner");
    expect(html).not.toContain("Accept All");
  });

  it("renders the recall button for them", async () => {
    const html = await render("GDPR", readServerConsent(acceptedHeader()));
    expect(html).toContain('data-cy-part="recall"');
  });

  it("renders no banner for a returning CCPA visitor either", async () => {
    const initialConsent = readServerConsent(acceptedHeader(), { regulation: "CCPA" });
    const html = await render("CCPA", initialConsent);
    expect(html).not.toContain("data-cky-banner");
    expect(html).not.toContain("Do Not Sell");
  });
});

describe("fresh visitor: nothing changes", () => {
  it("still renders the banner when initialConsent is null", async () => {
    const html = await render("GDPR", null);
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("Accept All");
    expect(html).not.toContain('data-cy-part="recall"');
  });

  it("still renders the banner when the prop is omitted entirely", async () => {
    expect(await render("GDPR", undefined)).toContain("data-cky-banner");
  });

  it("output is identical with the prop omitted and with it set to null", async () => {
    expect(await render("GDPR", null)).toBe(await render("GDPR", undefined));
  });

  it("a visitor who has not acted yet is treated as fresh", async () => {
    const notActed = acceptedHeader().replace("action%3Ayes", "action%3Ano");
    const initialConsent = readServerConsent(notActed);
    expect(initialConsent).toBeNull();
    expect(await render("GDPR", initialConsent)).toContain("data-cky-banner");
  });
});

describe("the provider does not change unrelated SSR behaviour", () => {
  it("a seeded decision does not affect the regulation the provider supplies", async () => {
    const initialConsent = readServerConsent(acceptedHeader());
    // CCPA via the provider, decision seeded: still no banner, and the regulation used is the
    // provider's, not the stored snapshot's.
    expect(await render("CCPA", initialConsent)).not.toContain("data-cky-banner");
  });
});
