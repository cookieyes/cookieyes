import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import RecallButton from "../controls/RecallButton.svelte";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, mountWith, settle, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

const LABEL = '[aria-label="Consent Preferences"]';

describe("RecallButton", () => {
  it("renders nothing while the banner is still visible", async () => {
    mountWith(cookieOnly("GDPR"), RecallButton);
    await settle();
    expect(document.querySelector(LABEL)).toBeNull();
  });

  it("appears after the user has acted and reopens preferences (GDPR)", async () => {
    mountWith(cookieOnly("GDPR"), RecallButton);
    getCookieYes().manager.acceptAll();
    await settle();

    const button = document.querySelector(LABEL);
    expect(button).toBeTruthy();

    await click(button);
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);
  });

  it("appears after the banner is dismissed without a decision (GDPR)", async () => {
    mountWith(cookieOnly("GDPR"), RecallButton);
    getCookieYes().manager.dismissBanner();
    await settle();
    expect(document.querySelector(LABEL)).toBeTruthy();
  });

  it.each(["GDPR", "CCPA"] as const)("%s: marks itself as opening a dialog", async (regulation) => {
    mountWith(cookieOnly(regulation), RecallButton);
    getCookieYes().manager.acceptAll();
    await settle();
    expect(document.querySelector(LABEL)?.getAttribute("aria-haspopup")).toBe("dialog");
  });

  it("opens the opt-out dialog under CCPA", async () => {
    mountWith(cookieOnly("CCPA"), RecallButton);
    getCookieYes().manager.acceptAll();
    await settle();
    await click(document.querySelector(LABEL));
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(true);
  });

  it("is moved into the portal root, with the default class and a tooltip", async () => {
    mountWith(cookieOnly("GDPR"), RecallButton);
    getCookieYes().manager.acceptAll();
    await settle();
    const button = document.querySelector("#cookieyes-portal-root .cy-widget");
    expect(button?.getAttribute("data-tooltip")).toBe("Consent Preferences");
    expect(button?.querySelector("svg")).not.toBeNull();
  });

  it("replaces the default class, runs the caller's click first and renders its children", async () => {
    const calls: string[] = [];
    mountWith(cookieOnly("GDPR"), RecallButton, {
      class: "mine",
      onclick: () => calls.push("caller"),
      children: createRawSnippet(() => ({ render: () => "<span>Cookies</span>" })),
    });
    getCookieYes().manager.acceptAll();
    await settle();
    const button = document.querySelector<HTMLElement>(LABEL);
    expect(button?.classList.contains("mine")).toBe(true);
    expect(button?.classList.contains("cy-widget")).toBe(false);
    expect(button?.textContent).toBe("Cookies");

    await click(button);
    expect(calls).toEqual(["caller"]);
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);
  });

  it("does not open preferences when the caller's click prevents default", async () => {
    mountWith(cookieOnly("GDPR"), RecallButton, { onclick: (e: Event) => e.preventDefault() });
    getCookieYes().manager.acceptAll();
    await settle();
    await click(document.querySelector(LABEL));
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(false);
  });
});
