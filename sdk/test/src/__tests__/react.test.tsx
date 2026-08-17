// @vitest-environment jsdom
//
// The one file in this package that needs a DOM. React cannot render without one;
// everything else here stays on `environment: "node"`.
import { CookieBanner, useConsent, useConsentActions, usePreferencesOpen } from "@cookieyes/react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConsentTest } from "../harness.js";
import { createReactConsentTest, resetReactConsentTestState } from "../react-harness.js";

afterEach(() => {
  cleanup();
  resetReactConsentTestState();
});

function AnalyticsNotice() {
  const { categories } = useConsent();
  return <p>{categories.analytics ? "Analytics on" : "Analytics off"}</p>;
}

function AcceptButton() {
  const { acceptAll } = useConsentActions();
  return (
    <button type="button" onClick={acceptAll}>
      Accept everything
    </button>
  );
}

describe("testing components that read consent", () => {
  it("renders what a returning visitor already agreed to", () => {
    createReactConsentTest({ initialConsent: { analytics: true } });

    render(<AnalyticsNotice />);

    expect(screen.getByText("Analytics on")).toBeDefined();
  });

  it("renders the denied state for a brand-new visitor", () => {
    createReactConsentTest();

    render(<AnalyticsNotice />);

    expect(screen.getByText("Analytics off")).toBeDefined();
  });

  it("re-renders the component when consent changes mid-test", () => {
    const consent = createReactConsentTest({ initialConsent: { analytics: true } });
    render(<AnalyticsNotice />);
    expect(screen.getByText("Analytics on")).toBeDefined();

    // No act() wrapper at the call site — the harness owns that.
    consent.deny("analytics");

    expect(screen.getByText("Analytics off")).toBeDefined();
    expect(consent.has("analytics")).toBe(false);
  });

  it("surfaces an unsaved toggle as live state without committing it", () => {
    const consent = createReactConsentTest();
    render(<AnalyticsNotice />);

    consent.toggle("analytics", true);
    // `useConsent().categories` is the live value, so a checkbox flip renders…
    expect(screen.getByText("Analytics on")).toBeDefined();
    // …while committed consent — what you gate scripts on — is still false.
    expect(consent.has("analytics")).toBe(false);
    expect(consent.snapshot().committed.analytics).toBe(false);

    consent.save();
    expect(consent.has("analytics")).toBe(true);
  });

  it("sees consent the component itself changed", async () => {
    const consent = createReactConsentTest();

    render(<AcceptButton />);
    screen.getByRole("button", { name: "Accept everything" }).click();

    await consent.whenReady();
    expect(consent.has("analytics")).toBe(true);
    expect(consent.events("save")).toHaveLength(1);
  });

  it("renders a real preset against the seeded state", () => {
    createReactConsentTest();

    render(<CookieBanner />);

    // A brand-new visitor sees the banner.
    expect(screen.getByText("Accept All")).toBeDefined();
    expect(
      screen.getByText("We value your privacy", { selector: ".cy-banner-title" }),
    ).toBeDefined();
  });

  it("hides the banner for a visitor who already decided", () => {
    createReactConsentTest({ initialConsent: { analytics: true } });

    render(<CookieBanner />);

    expect(screen.queryByText("Accept All")).toBeNull();
  });

  it("dismisses a real banner when consent is granted through the harness", () => {
    const consent = createReactConsentTest();
    render(<CookieBanner />);
    expect(screen.getByText("Accept All")).toBeDefined();

    consent.acceptAll();

    expect(screen.queryByText("Accept All")).toBeNull();
  });
});

describe("React-only harness surface", () => {
  it("drives the preferences dialog and reports it in the snapshot", () => {
    const consent = createReactConsentTest();

    function Dialog() {
      const isOpen = usePreferencesOpen();
      return <p>{isOpen ? "open" : "closed"}</p>;
    }
    render(<Dialog />);
    expect(screen.getByText("closed")).toBeDefined();

    consent.showPreferences();

    expect(screen.getByText("open")).toBeDefined();
    expect(consent.snapshot().isPreferencesOpen).toBe(true);

    consent.hidePreferences();
    expect(consent.snapshot().isPreferencesOpen).toBe(false);
  });

  it("drives the opt-out dialog", () => {
    const consent = createReactConsentTest({ regulation: "CCPA" });
    expect(consent.snapshot().isOptOutOpen).toBe(false);

    consent.showOptOut();
    expect(consent.snapshot().isOptOutOpen).toBe(true);

    consent.hideOptOut();
    expect(consent.snapshot().isOptOutOpen).toBe(false);
  });

  it("exposes the reload notice and lets it be dismissed", () => {
    const consent = createReactConsentTest();

    expect(consent.snapshot().reloadNotice).toEqual({ required: false, reasons: [] });
    expect(() => consent.dismissReloadNotice()).not.toThrow();
  });

  it("hands back the runtime the hooks are actually reading", () => {
    const consent = createReactConsentTest({ initialConsent: { analytics: true } });

    expect(consent.runtime.getSnapshot().committedCategories.analytics).toBe(true);
    expect(consent.runtime.categories.ids).toContain("analytics");
  });
});

describe("the shared surface behaves identically to the core harness", () => {
  it("supports the same reads, mutations, and recorders", () => {
    const consent = createReactConsentTest({ mode: "self-hosted" });

    consent.acceptOnly(["analytics"]);

    expect(consent.has("analytics")).toBe(true);
    expect(consent.has("advertisement")).toBe(false);
    expect(consent.events("change")).toHaveLength(1);
    expect(consent.backendCalls()).toHaveLength(1);
    expect(consent.backendCalls()[0]?.categories.analytics).toBe(true);

    consent.withdrawAll();
    expect(consent.snapshot().committed.analytics).toBe(false);
    expect(consent.has("necessary")).toBe(true);
  });

  it("throws on an unknown category, exactly as the core harness does", () => {
    const consent = createReactConsentTest();
    expect(() => consent.grant("analytcs" as "analytics")).toThrow(
      /Unknown consent category "analytcs"/,
    );
  });

  it("narrows to a custom taxonomy's own ids", () => {
    const consent = createReactConsentTest({
      categories: [{ id: "essential", required: true }, { id: "marketing" }],
      initialConsent: { marketing: true },
    });

    expect([...consent.categories]).toEqual(["essential", "marketing"]);
    expect(consent.has("marketing")).toBe(true);
    expect(() =>
      // @ts-expect-error — not part of the declared taxonomy
      consent.grant("analytics"),
    ).toThrow(/Unknown consent category/);
  });

  it("starts every harness clean, even without a teardown", () => {
    const first = createReactConsentTest({ initialConsent: { analytics: true } });
    expect(first.has("analytics")).toBe(true);

    const second = createReactConsentTest();

    expect(second.has("analytics")).toBe(false);
    expect(second.snapshot().hasActed).toBe(false);
    expect(second.events()).toEqual([]);
  });
});

describe("act() handling", () => {
  let errors: unknown[][] = [];

  beforeEach(() => {
    errors = [];
    vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
      errors.push(args);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("emits no act() warning when consent is mutated with a component mounted", () => {
    const consent = createReactConsentTest();
    render(<AnalyticsNotice />);

    consent.grant("analytics");
    consent.deny("analytics");
    consent.acceptAll();
    consent.rejectAll();
    consent.resetVisitor();

    const actWarnings = errors.filter((args) => String(args[0]).includes("not wrapped in act"));
    expect(actWarnings).toEqual([]);
  });

  it("still works when nothing is rendered at all", () => {
    const consent = createReactConsentTest();

    expect(() => consent.acceptAll()).not.toThrow();
    expect(consent.has("analytics")).toBe(true);
  });
});

describe("mixing the two harnesses is refused by construction, not by convention", () => {
  it("the core harness does not drive React's runtime — which is why this entry exists", () => {
    // Documents the trap the React entry point removes. Two engines read the same
    // cookie at startup and diverge on the first mutation, so a test built this way
    // asserts against state the component never sees.
    const core = createConsentTest();
    const react = createReactConsentTest();

    core.grant("analytics");

    expect(core.has("analytics")).toBe(true);
    expect(react.has("analytics")).toBe(false);
  });
});

describe("Google Consent Mode against a real window (jsdom)", () => {
  it("uses the existing window rather than installing one", () => {
    const consent = createReactConsentTest({
      googleConsentMode: true,
      initialConsent: { analytics: true },
    });

    const updates = consent.googleConsent();
    expect(updates.length).toBeGreaterThan(0);
    expect(updates[updates.length - 1]?.signals.analytics_storage).toBe("granted");
    // jsdom's own hostname, not the node shim's — the real window was reused.
    expect(window.location.hostname).toBe("localhost");
  });

  it("restores a dataLayer the test already owned", () => {
    const host = window as Window & { dataLayer?: unknown[] };
    const mine = [{ event: "my_own_push" }];
    host.dataLayer = mine;

    const consent = createReactConsentTest({ googleConsentMode: true });
    expect(host.dataLayer).not.toBe(mine);

    consent.teardown();

    expect(host.dataLayer).toBe(mine);
    delete host.dataLayer;
  });

  it("leaves no dataLayer behind when the test did not own one", () => {
    const host = window as Window & { dataLayer?: unknown[] };
    expect(host.dataLayer).toBeUndefined();

    const consent = createReactConsentTest({ googleConsentMode: true });
    consent.teardown();

    expect(host.dataLayer).toBeUndefined();
  });
});
