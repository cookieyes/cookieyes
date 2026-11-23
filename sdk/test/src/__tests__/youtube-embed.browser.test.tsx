// The YouTube embed in real Chromium at four moments of a visit: before a choice, after
// accepting, after withdrawing and after a reload. Every request to an outside host is caught
// and answered with an empty page, so the real YouTube is never contacted and the test can
// check where the page wanted to go. Run with `pnpm --filter @cookieyes/test test:browser`.
/// <reference types="@vitest/browser-playwright" />
// @ts-expect-error: a stylesheet has no type declarations; Vite loads it in the browser run.
import "@cookieyes/ui/styles.css";
import { _clearStopHandlers, type CookieYesConfig } from "@cookieyes/core";
import {
  blockIframes,
  getCookieYes,
  initCookieYes,
  resetCookieYes,
  YouTubeEmbed,
} from "@cookieyes/react";
import { act, cleanup, render } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

const ADDRESS = "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw";
const CONFIG: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };

/** The address of every request the page made to an outside host, in order. */
const requests: string[] = [];

// The test page itself is served over http, so `https://*` matches outside hosts only.
beforeAll(async () => {
  await cdp().send("Fetch.enable", { patterns: [{ urlPattern: "https://*" }] });
  cdp().on("Fetch.requestPaused", async ({ requestId, request }) => {
    await cdp().send("Fetch.fulfillRequest", {
      requestId,
      responseCode: 200,
      responseHeaders: [{ name: "Content-Type", value: "text/html" }],
      body: "",
    });
    // Listed only once answered, so a test that waits for a request never moves on, and
    // removes the iframe, while the answer is still on its way.
    requests.push(request.url);
  });
});
afterAll(() => cdp().send("Fetch.disable"));

/** Gives a request that must not happen the time to happen. */
function quiet(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

/** What a reload does to the SDK: everything in memory goes, the saved choice stays. */
function forgetPage(): void {
  cleanup();
  resetCookieYes();
  _clearStopHandlers();
}

afterEach(() => {
  forgetPage();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  document.body.innerHTML = "";
  requests.length = 0;
});

describe("YouTubeEmbed in a real browser (react)", () => {
  const open = () => {
    initCookieYes(CONFIG);
    render(<YouTubeEmbed videoId="jNQXAC9IVRw" title="Me at the zoo" />);
  };
  const box = () => {
    const { width, height } = document.querySelector(".cy-youtube")?.getBoundingClientRect() ?? {};
    return { width, height };
  };

  it("contacts YouTube only while its category is granted", async () => {
    open();

    // Before a choice.
    await quiet();
    expect(document.querySelector("iframe")).toBeNull();
    expect(requests).toEqual([]);
    const placeholderBox = box();

    // After accepting, with a real click on the placeholder's button.
    await userEvent.click(page.getByRole("button", { name: "Allow Advertisement cookies" }));
    await expect.poll(() => requests).toEqual([ADDRESS]);
    // The player took the placeholder's place without moving anything.
    expect(box()).toEqual(placeholderBox);

    // After withdrawing.
    act(() => getCookieYes().manager.rejectAll());
    await quiet();
    expect(document.querySelector("iframe")).toBeNull();
    expect(requests).toEqual([ADDRESS]);

    // After a reload.
    forgetPage();
    open();
    await quiet();
    expect(document.querySelector("iframe")).toBeNull();
    expect(requests).toEqual([ADDRESS]);
  });
});

describe("blockIframes in a real browser", () => {
  const open = () => {
    initCookieYes(CONFIG);
    const cy = getCookieYes();
    return blockIframes(cy.manager, cy);
  };

  it("contacts YouTube only while the iframe's category is granted", async () => {
    document.body.innerHTML = `<iframe data-cy-src="${ADDRESS}" data-cy-category="advertisement" title="Me at the zoo"></iframe>`;
    const iframe = document.querySelector("iframe");
    let stop = open();

    // Before a choice.
    await quiet();
    expect(iframe?.hasAttribute("src")).toBe(false);
    expect(requests).toEqual([]);

    // After accepting.
    getCookieYes().manager.acceptAll();
    await expect.poll(() => requests).toEqual([ADDRESS]);

    // After withdrawing.
    getCookieYes().manager.rejectAll();
    await quiet();
    expect(iframe?.hasAttribute("src")).toBe(false);
    expect(requests).toEqual([ADDRESS]);

    // After a reload.
    stop();
    forgetPage();
    stop = open();
    await quiet();
    expect(iframe?.hasAttribute("src")).toBe(false);
    expect(requests).toEqual([ADDRESS]);
    stop();
  });
});

// Last in this file: a policy set by a meta tag cannot be taken back.
describe("YouTubeEmbed under a strict Content Security Policy (react)", () => {
  it("needs no allowance beyond the player's own address", async () => {
    const violations: string[] = [];
    const onViolation = (event: SecurityPolicyViolationEvent) =>
      violations.push(event.violatedDirective);
    document.addEventListener("securitypolicyviolation", onViolation);
    const policy = document.createElement("meta");
    policy.httpEquiv = "Content-Security-Policy";
    policy.content = "style-src 'self'; frame-src https://www.youtube-nocookie.com";
    document.head.append(policy);

    // A theme is the one case where the SDK sets styles on an element at run time.
    initCookieYes({ ...CONFIG, theme: { primaryColor: "#7c3aed" } });
    render(<YouTubeEmbed videoId="jNQXAC9IVRw" title="Me at the zoo" />);
    await quiet();
    await userEvent.click(page.getByRole("button", { name: "Allow Advertisement cookies" }));
    await expect.poll(() => requests).toEqual([ADDRESS]);
    act(() => getCookieYes().manager.rejectAll());
    await quiet();
    expect(violations).toEqual([]);

    // The policy must be active, or "no violation" proves nothing: a frame from another
    // address is refused.
    const probe = document.createElement("iframe");
    probe.src = "https://www.youtube.com/embed/jNQXAC9IVRw";
    document.body.append(probe);
    await expect.poll(() => violations).toEqual(["frame-src"]);
    document.removeEventListener("securitypolicyviolation", onViolation);
  });
});
