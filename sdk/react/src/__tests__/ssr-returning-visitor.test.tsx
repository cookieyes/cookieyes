import { readServerConsent } from "@cookieyes/core";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CookieYesProvider } from "../context/CookieYesProvider.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

/**
 * A returning visitor must never see the banner appear and
 * then vanish.
 *
 * The server snapshot always describes a fresh visitor, so without a seeded
 * decision the server sends banner markup to everyone and the client removes it
 * after hydration — a visible flash that reads as a bug. Seeding the decision
 * through `<CookieYesProvider initialConsent>` means the banner is never in the
 * HTML at all: nothing to hide, so nothing flashes.
 */
beforeEach(clearCookie);
afterEach(teardown);

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

describe("returning visitor: the banner is absent from server-rendered HTML", () => {
  it("renders no banner when initialConsent reports a decision", () => {
    mountOffline("GDPR");
    const initialConsent = readServerConsent(acceptedHeader());
    expect(initialConsent).not.toBeNull();

    const html = renderToStaticMarkup(
      <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
        <CookieBanner />
      </CookieYesProvider>,
    );

    expect(html).not.toContain("data-cky-banner");
    expect(html).not.toContain("Accept All");
  });

  it("renders no banner for a returning CCPA visitor either", () => {
    mountOffline("CCPA");
    const initialConsent = readServerConsent(acceptedHeader(), { regulation: "CCPA" });
    const html = renderToStaticMarkup(
      <CookieYesProvider regulation="CCPA" initialConsent={initialConsent}>
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(html).not.toContain("data-cky-banner");
    expect(html).not.toContain("Do Not Sell");
  });
});

describe("fresh visitor: nothing changes", () => {
  it("still renders the banner when initialConsent is null", () => {
    mountOffline("GDPR");
    const html = renderToStaticMarkup(
      <CookieYesProvider regulation="GDPR" initialConsent={null}>
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(html).toContain("data-cky-banner");
    expect(html).toContain("Accept All");
  });

  it("still renders the banner when the prop is omitted entirely", () => {
    mountOffline("GDPR");
    const html = renderToStaticMarkup(
      <CookieYesProvider regulation="GDPR">
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(html).toContain("data-cky-banner");
  });

  it("output is identical with the prop omitted and with it set to null", () => {
    mountOffline("GDPR");
    const omitted = renderToStaticMarkup(
      <CookieYesProvider regulation="GDPR">
        <CookieBanner />
      </CookieYesProvider>,
    );
    const explicitNull = renderToStaticMarkup(
      <CookieYesProvider regulation="GDPR" initialConsent={null}>
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(explicitNull).toBe(omitted);
  });

  it("a visitor who has not acted yet is treated as fresh", () => {
    mountOffline("GDPR");
    const notActed = acceptedHeader().replace("action%3Ayes", "action%3Ano");
    const initialConsent = readServerConsent(notActed);
    expect(initialConsent).toBeNull();
    const html = renderToStaticMarkup(
      <CookieYesProvider regulation="GDPR" initialConsent={initialConsent}>
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(html).toContain("data-cky-banner");
  });
});

describe("the provider does not change unrelated SSR behaviour", () => {
  it("a seeded decision does not affect the regulation the provider supplies", () => {
    mountOffline("GDPR");
    const initialConsent = readServerConsent(acceptedHeader());
    // CCPA via the provider, decision seeded: still no banner, and the
    // regulation used is the provider's, not the stored snapshot's.
    const html = renderToStaticMarkup(
      <CookieYesProvider regulation="CCPA" initialConsent={initialConsent}>
        <CookieBanner />
      </CookieYesProvider>,
    );
    expect(html).not.toContain("data-cky-banner");
  });

  it("without a provider the banner still server-renders as before", () => {
    mountOffline("GDPR");
    const html = renderToStaticMarkup(<CookieBanner />);
    expect(html).toContain("data-cky-banner");
  });
});
