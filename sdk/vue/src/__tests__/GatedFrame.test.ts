import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { GatedFrame } from "../controls/GatedFrame.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, click, cookieOnly, getByText, mountWith, unmountAll } from "./test-utils.js";

const SRC = "https://www.youtube.com/embed/dQw4w9WgXcQ";

/** Declared locally, see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] };

beforeEach(clearCookie);
afterEach(unmountAll);

async function mountFrame(
  props: Record<string, unknown> = { category: "analytics" },
  slots?: Record<string, () => unknown>,
) {
  const wrapper = mountWith(
    cookieOnly("GDPR"),
    defineComponent({ render: () => h(GatedFrame, { src: SRC, ...props } as never, slots) }),
  );
  await flushPromises();
  return wrapper;
}

describe("GatedFrame", () => {
  it("shows a placeholder while the category is denied", async () => {
    await mountFrame();
    expect(document.querySelector("iframe")).toBeNull();
    expect(getByText("Manage Preferences")).toBeTruthy();
  });

  it("names the category by its label, not its id", async () => {
    await mountFrame();
    expect(getByText("Analytics").tagName).toBe("STRONG");
  });

  it("warns about a category that is not configured", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await mountFrame({ category: "videos" });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"videos"'));
  });

  it("renders a custom placeholder when provided", async () => {
    await mountFrame(
      { category: "analytics" },
      { placeholder: () => h("span", "enable analytics") },
    );
    expect(getByText("enable analytics")).toBeTruthy();
    expect(document.querySelector(".cy-frame-placeholder button")).toBeNull();
  });

  it("opens preferences from the default placeholder button", async () => {
    await mountFrame();
    await click(getByText("Manage Preferences"));
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);
  });

  it("renders the iframe once the category is consented (saved decision)", async () => {
    mountWith(
      cookieOnly("GDPR"),
      defineComponent({
        render: () => h(GatedFrame, { src: SRC, category: "analytics", title: "video" }),
      }),
    );
    getCookieYes().manager.acceptAll();
    await flushPromises();
    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(SRC);
    expect(iframe?.getAttribute("title")).toBe("video");
  });

  it("does NOT render on a transient toggle, only on a saved decision", async () => {
    await mountFrame({ category: "analytics", title: "video" });
    const { manager } = getCookieYes();
    // Flipping the switch in the (unsaved) dialog must not load the embed.
    manager.updateCategory("analytics", true);
    await flushPromises();
    expect(document.querySelector("iframe")).toBeNull();
    // Saving commits it, so now it loads.
    manager.savePreferences();
    await flushPromises();
    expect(document.querySelector("iframe")).not.toBeNull();
  });

  it("swaps back to the placeholder when the category is withdrawn (saved decision)", async () => {
    await mountFrame({ category: "analytics", title: "video" });
    const { manager } = getCookieYes();
    manager.acceptAll();
    await flushPromises();
    expect(document.querySelector("iframe")).not.toBeNull();
    // Flipping the switch off in the (unsaved) dialog must not remove the embed.
    manager.updateCategory("analytics", false);
    await flushPromises();
    expect(document.querySelector("iframe")).not.toBeNull();
    // Saving commits the withdrawal, so now it goes.
    manager.savePreferences();
    await flushPromises();
    expect(document.querySelector("iframe")).toBeNull();
    expect(getByText("Manage Preferences")).toBeTruthy();
  });

  it("renders the iframe again when the category is granted again", async () => {
    await mountFrame({ category: "analytics", title: "video" });
    const { manager } = getCookieYes();
    manager.acceptAll();
    await flushPromises();
    manager.rejectAll();
    await flushPromises();
    expect(document.querySelector("iframe")).toBeNull();
    manager.acceptAll();
    await flushPromises();
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(SRC);
  });
});

describe("GatedFrame devtools instrumentation", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
  });

  it("records its src as managed on the devtools queue, even behind the placeholder", async () => {
    process.env.NODE_ENV = "development";
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
    await mountFrame();
    const pushed = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? []).filter(
      (e) => e.k === "s",
    );
    expect(pushed.map((e) => e.d)).toEqual([
      { id: SRC, src: SRC, category: "analytics", via: "GatedFrame" },
    ]);
  });

  it("records nothing in production", async () => {
    process.env.NODE_ENV = "production";
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
    await mountFrame();
    const pushed = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? []).filter(
      (e) => e.k === "s",
    );
    expect(pushed).toEqual([]);
  });
});
