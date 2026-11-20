import { readServerConsent } from "@cookieyes/core";
import { hydrate, unmount } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _isServerFirst } from "../hooks/server-first.js";
import { getCookieYes } from "../runtime.js";
import SsrPage from "./fixtures/SsrPage.svelte";
import { type PageSpec, renderOnServer, useServerRenderer } from "./ssr-render.js";
import { clearCookie, settle, unmountAll } from "./test-utils.js";

/**
 * The server sends markup; the client hydrates it. Svelte repairs a mismatch silently (an
 * `{#if}`, a text node or an attribute that differs is rewritten, not reported), so "no warning"
 * proves nothing. These cases instead render on the server, load that exact HTML, hydrate it, and
 * require the DOM right after `hydrate()` returns, before any effect has run, to equal the
 * server's. The control case shows the check does see a difference.
 */
const mounted: ReturnType<typeof hydrate>[] = [];

useServerRenderer();
beforeEach(clearCookie);
afterEach(async () => {
  for (const app of mounted.splice(0)) await unmount(app);
  unmountAll();
  Reflect.deleteProperty(navigator, "globalPrivacyControl");
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

const PARTS: PageSpec["parts"] = ["banner", "preferences", "recall"];

/** Renders on the server, hydrates the result, and reports the DOM at each step. */
async function serverThenClient(
  server: PageSpec,
  client: PageSpec = server,
  beforeClient?: () => void,
): Promise<{
  html: string;
  container: HTMLElement;
  serverBanner: Element | null;
  atLoad: string;
  afterHydrate: string;
  serverFirst: boolean;
}> {
  const { body } = await renderOnServer(server);
  beforeClient?.();
  const container = document.createElement("div");
  container.innerHTML = body;
  document.body.append(container);
  const atLoad = container.innerHTML;
  const serverBanner = container.querySelector(".cy-banner-wrap");
  // What the provider will conclude about this page, asked of a fresh claim and then given back.
  const serverFirst = _isServerFirst();
  const { _resetServerFirst } = await import("../hooks/server-first.js");
  _resetServerFirst();
  mounted.push(hydrate(SsrPage, { target: container, props: { spec: client } }));
  // Before any effect has run: this is the DOM hydration itself produced.
  const afterHydrate = container.innerHTML;
  await settle();
  return { html: body, container, serverBanner, atLoad, afterHydrate, serverFirst };
}

function portalRoot(): HTMLElement {
  const root = document.getElementById("cookieyes-portal-root");
  if (!root) throw new Error("no portal root");
  return root;
}

describe("hydration: first visit, GDPR", () => {
  it("hydrates the server banner into the same DOM and moves the same node into the portal", async () => {
    const { html, serverBanner, atLoad, afterHydrate, serverFirst } = await serverThenClient({
      regulation: "GDPR",
      parts: PARTS,
    });
    expect(serverFirst).toBe(true);
    expect(html).toContain("data-cky-banner");
    expect(html).not.toContain("style=");
    expect(html).not.toContain("data-cy-entered");
    expect(afterHydrate).toBe(atLoad);
    expect(serverBanner).not.toBeNull();
    expect(portalRoot().contains(serverBanner)).toBe(true);
    expect(serverBanner?.getAttribute("data-cy-entered")).toBe("");
    expect(portalRoot().querySelectorAll("[data-cy-entered]")).toHaveLength(1);
  });
});

describe("hydration: returning visitor", () => {
  it("sends no banner and hydrates the recall button into the same DOM", async () => {
    const initialConsent = readServerConsent(acceptedHeader(), { regulation: "GDPR" });
    expect(initialConsent).not.toBeNull();
    const spec: PageSpec = { regulation: "GDPR", parts: PARTS, initialConsent };
    const { html, container, atLoad, afterHydrate } = await serverThenClient(spec, spec, () => {
      document.cookie = acceptedHeader();
    });
    expect(html).not.toContain("data-cky-banner");
    expect(html).toContain('data-cy-part="recall"');
    expect(afterHydrate).toBe(atLoad);
    expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
    expect(portalRoot().children).toHaveLength(1);
    expect(portalRoot().querySelector('[data-cy-part="recall"]')).not.toBeNull();
    expect(container.querySelector(".cy-banner-wrap")).toBeNull();
  });

  it("with the cookie but no initialConsent, removes the banner after hydrating and focuses the recall button", async () => {
    const spec: PageSpec = { regulation: "GDPR", parts: PARTS };
    const { html, atLoad, afterHydrate } = await serverThenClient(spec, spec, () => {
      document.cookie = acceptedHeader();
    });
    expect(html).toContain("data-cky-banner");
    expect(afterHydrate).toBe(atLoad);
    expect(document.querySelector('[data-cy-part="banner"]')).toBeNull();
    const recall = document.querySelector('[data-cy-part="recall"]');
    expect(recall).not.toBeNull();
    expect(document.activeElement).toBe(recall);
  });
});

describe("hydration: CCPA visitor", () => {
  const ccpa: PageSpec = { region: "US-CA", parts: [...PARTS, "optout"] };

  it("hydrates the Do Not Sell banner into the same DOM, with every category on in the snapshot", async () => {
    const { html, atLoad, afterHydrate } = await serverThenClient(ccpa);
    expect(html).toContain("Do Not Sell");
    expect(html).toContain("cy-banner-footer--ccpa");
    expect(afterHydrate).toBe(atLoad);
    const banner = document.querySelector(".cy-banner-wrap");
    expect(banner).not.toBeNull();
    expect(portalRoot().contains(banner)).toBe(true);
    expect(banner?.getAttribute("data-cy-entered")).toBe("");
    expect(document.querySelector('[data-cy-part="do-not-sell"]')).not.toBeNull();
    expect(getCookieYes().getServerSnapshot().regulation).toBe("CCPA");
  });
});

describe("hydration: GPC visitor", () => {
  it("renders the same HTML as any CCPA visitor and applies the opt-out only after mount", async () => {
    const spec: PageSpec = { region: "US-CA", parts: PARTS };
    const plain = await renderOnServer(spec);
    // The server never reads GPC, so the visitor with the signal gets exactly the same page.
    Object.defineProperty(navigator, "globalPrivacyControl", { value: true, configurable: true });
    const { html, atLoad, afterHydrate } = await serverThenClient(spec);
    expect(html).toBe(plain.body);
    expect(afterHydrate).toBe(atLoad);
    // The signal starts the visitor opted out without counting as a decision, and the server
    // snapshot, which cannot know about it, still has every category on.
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
    expect(getCookieYes().getSnapshot().committedCategories.analytics).toBe(false);
    expect(getCookieYes().getServerSnapshot().committedCategories.analytics).toBe(true);
  });
});

describe("the hydration check", () => {
  it("sees a difference when the client renders another regulation than the server did", async () => {
    // Svelte repairs this without a word, so only the comparison can tell.
    const { atLoad, afterHydrate } = await serverThenClient(
      { regulation: "GDPR", parts: ["banner"] },
      { regulation: "CCPA", parts: ["banner"] },
    );
    expect(afterHydrate).not.toBe(atLoad);
  });

  it("reports no server markup for a client-only mount, so it reads live state at once", () => {
    const target = document.createElement("div");
    document.body.append(target);
    expect(_isServerFirst()).toBe(false);
  });

  it("gives the claim to the first provider only", async () => {
    const { body } = await renderOnServer({ regulation: "GDPR", parts: ["banner"] });
    document.body.innerHTML = body;
    expect(_isServerFirst()).toBe(true);
    expect(_isServerFirst()).toBe(false);
  });
});
