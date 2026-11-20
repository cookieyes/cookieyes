import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GatedFrame from "../controls/GatedFrame.svelte";
import { getCookieYes } from "../runtime.js";
import {
  clearCookie,
  click,
  cookieOnly,
  getByText,
  mountWith,
  settle,
  unmountAll,
} from "./test-utils.js";

const SRC = "https://www.youtube.com/embed/dQw4w9WgXcQ";

/** Declared locally, see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] };

beforeEach(clearCookie);
afterEach(unmountAll);

async function mountFrame(props: Record<string, unknown> = { category: "analytics" }) {
  const wrapper = mountWith(cookieOnly("GDPR"), GatedFrame, { src: SRC, ...props });
  await settle();
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

  it("renders a custom placeholder snippet when provided", async () => {
    await mountFrame({
      category: "analytics",
      placeholder: createRawSnippet(() => ({ render: () => "<span>enable analytics</span>" })),
    });
    expect(getByText("enable analytics")).toBeTruthy();
    expect(document.querySelector(".cy-frame-placeholder button")).toBeNull();
  });

  it("opens preferences from the default placeholder button", async () => {
    await mountFrame();
    await click(getByText("Manage Preferences"));
    expect(getCookieYes().getSnapshot().isPreferencesOpen).toBe(true);
  });

  it("renders the iframe once the category is consented (saved decision)", async () => {
    mountWith(cookieOnly("GDPR"), GatedFrame, { src: SRC, category: "analytics", title: "video" });
    getCookieYes().manager.acceptAll();
    await settle();
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
    await settle();
    expect(document.querySelector("iframe")).toBeNull();
    // Saving commits it, so now it loads.
    manager.savePreferences();
    await settle();
    expect(document.querySelector("iframe")).not.toBeNull();
  });

  it("latches: stays rendered after the category is revoked (reload to re-block)", async () => {
    await mountFrame({ category: "analytics", title: "video" });
    const { manager } = getCookieYes();
    manager.acceptAll();
    await settle();
    expect(document.querySelector("iframe")).not.toBeNull();
    // Revoke through a real action: the loaded frame must NOT swap back to the placeholder
    // mid-session.
    manager.rejectAll();
    await settle();
    expect(document.querySelector("iframe")).not.toBeNull();
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
