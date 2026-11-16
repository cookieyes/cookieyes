import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, Fragment, h, nextTick } from "vue";
import { RecallButton } from "../controls/RecallButton.js";
import { CookieOptOut } from "../presets/CookieOptOut.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, getByText, mountWith, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(() => {
  vi.useRealTimers();
  unmountAll();
});

async function mountOptOut(open = true) {
  const wrapper = mountWith(cookieOnly("CCPA"), CookieOptOut);
  if (open) getCookieYes().showOptOut();
  await flushPromises();
  return wrapper;
}

function checkbox(): HTMLInputElement {
  const el = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
  if (!el) throw new Error("no checkbox");
  return el;
}

describe("CookieOptOut", () => {
  it("renders nothing while the opt-out dialog is closed", async () => {
    await mountOptOut(false);
    expect(document.querySelector("[role=dialog]")).toBeNull();
  });

  it("renders the opt-out dialog with a toggle once opened", async () => {
    await mountOptOut();
    expect(getByText("Opt-out Preferences")).toBeTruthy();
    expect(checkbox()).toBeTruthy();
    expect(getByText("Save My Preferences")).toBeTruthy();
  });

  it("labels the checkbox with a generated id", async () => {
    await mountOptOut();
    const label = document.querySelector("label");
    expect(label?.getAttribute("for")).toBe(checkbox().id);
    expect(checkbox().id).not.toBe("");
  });

  it("starts unticked under CCPA, where analytics is on until the visitor opts out", async () => {
    await mountOptOut();
    expect(checkbox().checked).toBe(false);
  });

  it("records the opt-out when the checkbox is checked and saved", async () => {
    await mountOptOut();
    await click(checkbox());
    await click(getByText("Save My Preferences"));
    expect(getCookieYes().getSnapshot().hasActed).toBe(true);
    expect(getCookieYes().getSnapshot().committedCategories.analytics).toBe(false);
  });

  it("closes straight away, with no success message, when saved without opting out", async () => {
    await mountOptOut();
    await click(getByText("Save My Preferences"));

    const snapshot = getCookieYes().getSnapshot();
    expect(snapshot.hasActed).toBe(true);
    expect(snapshot.isOptOutOpen).toBe(false);
    expect(document.querySelector("[role=status]")).toBeNull();
  });

  it("cancels without saving", async () => {
    await mountOptOut();
    await click(getByText("Cancel"));
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(false);
    expect(getCookieYes().getSnapshot().hasActed).toBe(false);
  });

  it("closes itself after the countdown and hands focus to the revisit button", async () => {
    vi.useFakeTimers();
    mountWith(
      cookieOnly("CCPA"),
      defineComponent({ render: () => h(Fragment, null, [h(CookieOptOut), h(RecallButton)]) }),
    );
    getCookieYes().showOptOut();
    await nextTick();
    checkbox().click();
    await nextTick();
    (getByText("Save My Preferences") as HTMLElement).click();
    await nextTick();

    await vi.advanceTimersByTimeAsync(10_000);
    await nextTick();
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(false);
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Consent Preferences");
  });

  it("moves focus to the confirmation and tells screen readers it closes automatically", async () => {
    await mountOptOut();
    await click(checkbox());
    await click(getByText("Save My Preferences"));

    const status = document.querySelector<HTMLElement>("[role=status]");
    expect(status).not.toBeNull();
    expect(document.activeElement).toBe(status);
    const spoken = getByText("Banner closes automatically in 10 seconds...", "span");
    expect(spoken.closest("[aria-hidden]")).toBeNull();
    expect(
      status?.querySelector(".cy-optout-countdown")?.closest('[aria-hidden="true"]'),
    ).toBeTruthy();
  });

  it("locks the checkbox once saved and shows the countdown ticking", async () => {
    vi.useFakeTimers();
    mountWith(cookieOnly("CCPA"), CookieOptOut);
    getCookieYes().showOptOut();
    await nextTick();
    checkbox().click();
    await nextTick();
    (getByText("Save My Preferences") as HTMLElement).click();
    await nextTick();
    expect(checkbox().disabled).toBe(true);
    expect(document.querySelector(".cy-optout-countdown")?.textContent).toBe("10");

    await vi.advanceTimersByTimeAsync(3000);
    await nextTick();
    expect(document.querySelector(".cy-optout-countdown")?.textContent).toBe("7");
  });

  it("starts fresh each time it is opened", async () => {
    await mountOptOut();
    await click(checkbox());
    expect(checkbox().checked).toBe(true);
    getCookieYes().hideOptOut();
    await flushPromises();
    getCookieYes().showOptOut();
    await flushPromises();
    expect(checkbox().checked).toBe(false);
  });

  it("closes on Escape", async () => {
    await mountOptOut();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await flushPromises();
    expect(getCookieYes().getSnapshot().isOptOutOpen).toBe(false);
  });
});
