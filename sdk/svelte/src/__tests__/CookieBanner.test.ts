import { ANNOUNCE_DELAY_MS } from "@cookieyes/ui";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CookieBanner from "../presets/CookieBanner.svelte";
import { getCookieYes } from "../runtime.js";
import BannerWithRecall from "./fixtures/BannerWithRecall.svelte";
import {
  clearCookie,
  click,
  cookieOnly,
  getByText,
  mountWith,
  pressTab,
  queryByText,
  settle,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  vi.useRealTimers();
  unmountAll();
});

async function mountBanner(regulation: "GDPR" | "CCPA" = "GDPR") {
  const wrapper = mountWith(cookieOnly(regulation), CookieBanner);
  await settle();
  return wrapper;
}

describe("CookieBanner: GDPR", () => {
  it("renders the title and the opt-in actions", async () => {
    await mountBanner();
    // The title also appears in a visually hidden live-region announcer (for screen readers on
    // first appearance), so scope to the visible title.
    expect(getByText("We value your privacy", ".cy-banner-title")).toBeTruthy();
    expect(getByText("Accept All")).toBeTruthy();
    expect(getByText("Reject All")).toBeTruthy();
    expect(getByText("Customise")).toBeTruthy();
  });

  it("hides itself after Accept All", async () => {
    await mountBanner();
    await click(getByText("Accept All"));
    expect(queryByText("Accept All")).toBeNull();
  });

  it("grants nothing extra on Reject All but still dismisses", async () => {
    await mountBanner();
    await click(getByText("Reject All"));
    const snapshot = getCookieYes().getSnapshot();
    expect(snapshot.hasActed).toBe(true);
    expect(snapshot.categories.analytics).toBe(false);
  });

  it("opens the preferences dialog via Customise", async () => {
    await mountBanner();
    await click(getByText("Customise"));
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);
  });
});

describe("CookieBanner: focus trap", () => {
  it("is a modal dialog", async () => {
    await mountBanner();
    expect(document.querySelector("[role=dialog]")?.getAttribute("aria-modal")).toBe("true");
  });

  it("does not take focus on its own when it appears", async () => {
    await mountBanner();
    expect(document.activeElement).toBe(document.body);
  });

  it("pulls the first Tab from the page into the banner", async () => {
    await mountBanner();
    pressTab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close");
  });

  it("wraps Tab from the last control back to the first, and Shift+Tab the other way", async () => {
    await mountBanner();
    const last = document.querySelector<HTMLElement>("[role=dialog] a[href]");
    last?.focus();
    pressTab();
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close");
    pressTab(true);
    expect(document.activeElement).toBe(last);
  });

  it("stops trapping once the banner is gone", async () => {
    await mountBanner();
    await click(getByText("Accept All"));
    const outside = document.createElement("button");
    document.body.append(outside);
    outside.focus();
    pressTab();
    expect(document.activeElement).toBe(outside);
  });

  it("does not close on Escape: the banner needs an answer", async () => {
    await mountBanner();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await settle();
    expect(document.querySelector("[role=dialog]")).not.toBeNull();
  });
});

describe("CookieBanner: close button", () => {
  it.each(["GDPR", "CCPA"] as const)("%s: only closes, saves no consent", async (regulation) => {
    await mountBanner(regulation);
    const before = getCookieYes().getSnapshot().committedCategories;
    // CCPA writes an undecided default cookie on load; the click must not change it.
    const cookieBefore = document.cookie;
    await click(document.querySelector('button[aria-label="Close"]'));
    expect(document.querySelector("[role=dialog]")).toBeNull();
    const snapshot = getCookieYes().getSnapshot();
    expect(snapshot.hasActed).toBe(false);
    expect(snapshot.committedCategories).toEqual(before);
    expect(document.cookie).toBe(cookieBefore);
  });
});

describe("CookieBanner: dialog buttons and focus hand-off", () => {
  it("marks Customise as opening its dialog", async () => {
    await mountBanner();
    expect(getByText("Customise").getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("marks Do Not Sell as opening its dialog", async () => {
    await mountBanner("CCPA");
    expect(
      getByText("Do Not Sell or Share My Personal Information").getAttribute("aria-haspopup"),
    ).toBe("dialog");
  });

  it.each(["Accept All", "Reject All", "Close"])(
    "moves focus to the revisit button after %s",
    async (name) => {
      mountWith(cookieOnly("GDPR"), BannerWithRecall);
      await settle();
      const button =
        name === "Close"
          ? document.querySelector<HTMLElement>('button[aria-label="Close"]')
          : getByText(name);
      button?.focus();
      await click(button);
      expect(document.activeElement?.getAttribute("aria-label")).toBe("Consent Preferences");
    },
  );
});

describe("CookieBanner: DOM placement", () => {
  it("moves to the front of <body>, regardless of where it is rendered", async () => {
    // The app's own content is already in <body> when the banner mounts after it: the exact case
    // that made the banner unreachable without the portal.
    const appContent = document.createElement("div");
    appContent.id = "app-content-stand-in";
    document.body.appendChild(appContent);
    mountWith(cookieOnly("GDPR"), CookieBanner);
    await settle();

    const portalRoot = document.getElementById("cookieyes-portal-root");
    expect(portalRoot).toBeTruthy();
    expect(document.body.firstElementChild).toBe(portalRoot);
    expect(portalRoot?.querySelector("[data-cky-banner]")).toBeTruthy();
    expect(appContent.querySelector("[data-cky-banner]")).toBeNull();
  });

  it("marks the moved banner as entered so the entry animation does not replay", async () => {
    await mountBanner();
    expect(
      document
        .querySelector("#cookieyes-portal-root .cy-banner-wrap")
        ?.hasAttribute("data-cy-entered"),
    ).toBe(true);
  });

  it("animates normally when the banner reappears after a reset", async () => {
    await mountBanner();
    await click(getByText("Accept All"));
    getCookieYes().manager.resetConsent();
    await settle();
    const wrap = document.querySelector(".cy-banner-wrap");
    expect(wrap).not.toBeNull();
    expect(wrap?.hasAttribute("data-cy-entered")).toBe(false);
  });

  it("renders the announcer outside the banner, empty until its delay passes", async () => {
    await mountBanner();
    const announcer = document.querySelector('[aria-live="assertive"]');
    expect(announcer?.className).toBe("cy-sr-only");
    expect(announcer?.closest(".cy-banner-wrap")).toBeNull();
    expect(announcer?.textContent).toBe("");
  });
});

describe("CookieBanner: announcement", () => {
  it("announces the title after the delay and clears it once the banner is gone", async () => {
    vi.useFakeTimers();
    mountWith(cookieOnly("GDPR"), CookieBanner);
    await settle();
    const announcer = () => document.querySelector('[aria-live="assertive"]');
    expect(announcer()?.textContent).toBe("");

    await vi.advanceTimersByTimeAsync(ANNOUNCE_DELAY_MS);
    expect(announcer()?.textContent).toBe("We value your privacy");

    getCookieYes().manager.acceptAll();
    await settle();
    expect(announcer()?.textContent).toBe("");
  });
});

describe("CookieBanner: CCPA", () => {
  it("renders the Do Not Sell opt-out action", async () => {
    await mountBanner("CCPA");
    expect(getByText("Do Not Sell or Share My Personal Information")).toBeTruthy();
    expect(queryByText("Accept All")).toBeNull();
  });

  it("opens the opt-out dialog when Do Not Sell is clicked", async () => {
    await mountBanner("CCPA");
    await click(getByText("Do Not Sell or Share My Personal Information"));
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(true);
  });
});
