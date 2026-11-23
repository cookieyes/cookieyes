// The YouTube embed in real Chromium at four moments of a visit: before a choice, after
// accepting, after withdrawing and after a reload. Every request to an outside host is caught
// and answered with an empty page, so the real YouTube is never contacted and the test can
// check where the page wanted to go. Run with `pnpm --filter @cookieyes/svelte test:browser`.
/// <reference types="@vitest/browser-playwright" />
// @ts-expect-error: a stylesheet has no type declarations; Vite loads it in the browser run.
import "@cookieyes/ui/styles.css";
import { _clearStopHandlers, type ThemeConfig } from "@cookieyes/core";
import { mount, unmount } from "svelte";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";
import YouTubeEmbed from "../controls/YouTubeEmbed.svelte";
import { getCookieYes, resetCookieYes } from "../runtime.js";
import Harness from "./fixtures/Harness.svelte";

const ADDRESS = "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw";

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

let app: ReturnType<typeof mount> | null = null;

function open(theme?: ThemeConfig): void {
  app = mount(Harness, {
    target: document.body.appendChild(document.createElement("div")),
    props: {
      config: { mode: "cookie-only", regulation: "GDPR", theme },
      component: YouTubeEmbed,
      componentProps: { videoId: "jNQXAC9IVRw", title: "Me at the zoo" },
    },
  });
}

/** What a reload does to the SDK: everything in memory goes, the saved choice stays. */
async function forgetPage(): Promise<void> {
  if (app) await unmount(app);
  app = null;
  resetCookieYes();
  _clearStopHandlers();
  document.body.innerHTML = "";
}

function box() {
  const { width, height } = document.querySelector(".cy-youtube")?.getBoundingClientRect() ?? {};
  return { width, height };
}

afterEach(async () => {
  await forgetPage();
  document.cookie = "cookieyes-consent=; max-age=0; path=/";
  requests.length = 0;
});

describe("YouTubeEmbed in a real browser (svelte)", () => {
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
    getCookieYes().manager.rejectAll();
    await quiet();
    expect(document.querySelector("iframe")).toBeNull();
    expect(requests).toEqual([ADDRESS]);

    // After a reload.
    await forgetPage();
    open();
    await quiet();
    expect(document.querySelector("iframe")).toBeNull();
    expect(requests).toEqual([ADDRESS]);
  });

  // Last in this file: a policy set by a meta tag cannot be taken back.
  it("needs no allowance beyond the player's own address under a strict CSP", async () => {
    const violations: string[] = [];
    const onViolation = (event: SecurityPolicyViolationEvent) =>
      violations.push(event.violatedDirective);
    document.addEventListener("securitypolicyviolation", onViolation);
    const policy = document.createElement("meta");
    policy.httpEquiv = "Content-Security-Policy";
    policy.content = "style-src 'self'; frame-src https://www.youtube-nocookie.com";
    document.head.append(policy);

    // A theme is the one case where the SDK sets styles on an element at run time.
    open({ primaryColor: "#7c3aed" });
    await quiet();
    await userEvent.click(page.getByRole("button", { name: "Allow Advertisement cookies" }));
    await expect.poll(() => requests).toEqual([ADDRESS]);
    getCookieYes().manager.rejectAll();
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
