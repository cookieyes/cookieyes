import { type ConsentSnapshot, readServerConsent } from "@cookieyes/core";
import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type App, type Component, createSSRApp, defineComponent, Fragment, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { CookieYesProvider } from "../context/CookieYesProvider.js";
import { RecallButton } from "../controls/RecallButton.js";
import { CookieYes } from "../plugin.js";
import { CookieBanner } from "../presets/CookieBanner.js";
import { CookiePreferences } from "../presets/CookiePreferences.js";
import { resetCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, unmountAll } from "./test-utils.js";

/**
 * The server sends markup; the client hydrates it. Anything that differs between the two is a
 * hydration mismatch: Vue warns in development and a visitor can see the banner flash. These
 * cases render on the server, hydrate that exact HTML and require zero warnings.
 */
const apps: App[] = [];
beforeEach(clearCookie);
afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  unmountAll();
});

const STORED = [
  "consentid:abc",
  "consent:yes",
  "action:yes",
  "necessary:yes",
  "functional:yes",
  "analytics:yes",
  "performance:yes",
  "advertisement:yes",
  "lastRenewedDate:1700000000000",
];

/** The raw `Cookie` header a returning visitor's request carries. */
function acceptedHeader(): string {
  return `cookieyes-consent=${encodeURIComponent(STORED.join(","))}`;
}

type Case = {
  regulation: "GDPR" | "CCPA";
  initialConsent: ConsentSnapshot | null | undefined;
};

function page(c: Case): Component {
  return defineComponent({
    render: () =>
      h(
        CookieYesProvider,
        c.initialConsent === undefined
          ? { regulation: c.regulation }
          : { regulation: c.regulation, initialConsent: c.initialConsent },
        () => h(Fragment, [h(CookieBanner), h(CookiePreferences), h(RecallButton)]),
      ),
  });
}

/** Renders on the server, hydrates the result, and returns every warning raised on the way. */
async function serverThenClient(
  c: Case,
  beforeClient?: () => void,
): Promise<{
  html: string;
  container: HTMLElement;
  serverBanner: Element | null;
  warnings: string[];
}> {
  const config = cookieOnly(c.regulation);
  const serverApp = createSSRApp(page(c));
  serverApp.use(CookieYes, config);
  const html = await renderToString(serverApp);
  resetCookieYes();
  beforeClient?.();

  const warnings: string[] = [];
  const warn = vi.spyOn(console, "warn").mockImplementation((...args) => {
    warnings.push(args.map(String).join(" "));
  });
  const error = vi.spyOn(console, "error").mockImplementation((...args) => {
    warnings.push(args.map(String).join(" "));
  });
  const container = document.createElement("div");
  container.innerHTML = html;
  document.body.append(container);
  const serverBanner = container.querySelector(".cy-banner-wrap");
  const app = createSSRApp(page(c));
  app.config.warnHandler = (message) => {
    warnings.push(message);
  };
  app.use(CookieYes, config);
  app.mount(container);
  await flushPromises();
  warn.mockRestore();
  error.mockRestore();
  apps.push(app);
  return { html, container, serverBanner, warnings };
}

function portalRoot(): HTMLElement {
  const root = document.getElementById("cookieyes-portal-root");
  if (!root) throw new Error("no portal root");
  return root;
}

describe("hydration: first visit, GDPR", () => {
  it("hydrates the server banner with no mismatch and moves the same node into the portal", async () => {
    const { html, serverBanner, warnings } = await serverThenClient({
      regulation: "GDPR",
      initialConsent: null,
    });
    expect(html).toContain("data-cky-banner");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-cy-entered");
    expect(serverBanner).not.toBeNull();
    expect(warnings).toEqual([]);
    expect(portalRoot().contains(serverBanner)).toBe(true);
    expect(portalRoot().querySelectorAll("[data-cy-entered]")).toHaveLength(1);
    expect(serverBanner?.getAttribute("data-cy-entered")).toBe("");
  });
});

describe("hydration: returning GDPR visitor", () => {
  it("sends no banner and hydrates the recall button with no warnings", async () => {
    const initialConsent = readServerConsent(acceptedHeader(), { regulation: "GDPR" });
    expect(initialConsent).not.toBeNull();
    const { html, container, warnings } = await serverThenClient(
      { regulation: "GDPR", initialConsent },
      () => {
        document.cookie = acceptedHeader();
      },
    );
    expect(html).not.toContain("data-cky-banner");
    expect(html).toContain('data-cy-part="recall"');
    expect(warnings).toEqual([]);
    expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
    expect(portalRoot().children).toHaveLength(1);
    expect(portalRoot().querySelector('[data-cy-part="recall"]')).not.toBeNull();
    expect(container.querySelector(".cy-banner-wrap")).toBeNull();
  });

  it("hydrates with no warnings when the cookie is there but initialConsent is not, then removes the banner and focuses the recall button", async () => {
    const { html, warnings } = await serverThenClient(
      { regulation: "GDPR", initialConsent: null },
      () => {
        document.cookie = acceptedHeader();
      },
    );
    expect(html).toContain("data-cky-banner");
    expect(warnings).toEqual([]);
    expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
    const recall = document.querySelector('[data-cy-part="recall"]');
    expect(recall).not.toBeNull();
    expect(document.activeElement).toBe(recall);
  });
});

describe("hydration: CCPA visitor", () => {
  it("hydrates the Do Not Sell banner and the recall button with no warnings", async () => {
    const { html, warnings } = await serverThenClient({ regulation: "CCPA", initialConsent: null });
    expect(html).toContain("Do Not Sell");
    expect(warnings).toEqual([]);
    const banner = document.querySelector(".cy-banner-wrap");
    expect(banner).not.toBeNull();
    expect(portalRoot().contains(banner)).toBe(true);
    expect(banner?.getAttribute("data-cy-entered")).toBe("");
    expect(document.querySelector('[data-cy-part="do-not-sell"]')).not.toBeNull();
  });
});
