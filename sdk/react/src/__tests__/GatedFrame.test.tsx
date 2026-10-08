import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GatedFrame } from "../controls/GatedFrame.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

const SRC = "https://www.youtube.com/embed/dQw4w9WgXcQ";

/** Declared locally — see the identical note in core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string | undefined } };

type DevQueueEntry = { k: string; t: number; d: unknown };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueEntry[] };

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("GatedFrame", () => {
  it("shows a placeholder while the category is denied", () => {
    mountOffline("GDPR"); // analytics denied
    const { container } = render(<GatedFrame src={SRC} category="analytics" />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByText("Manage Preferences")).toBeTruthy();
  });

  it("names the category by its label, not its id", () => {
    mountOffline("GDPR");
    render(<GatedFrame src={SRC} category="analytics" />);
    expect(screen.getByText("Analytics").tagName).toBe("STRONG");
  });

  it("warns about a category that is not configured", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mountOffline("GDPR");
    render(<GatedFrame src={SRC} category="videos" />);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('"videos"'));
    warn.mockRestore();
  });

  it("renders a custom placeholder when provided", () => {
    mountOffline("GDPR");
    render(
      <GatedFrame src={SRC} category="analytics" placeholder={<span>enable analytics</span>} />,
    );
    expect(screen.getByText("enable analytics")).toBeTruthy();
  });

  it("opens preferences from the default placeholder button", () => {
    const rt = mountOffline("GDPR");
    render(<GatedFrame src={SRC} category="analytics" />);
    fireEvent.click(screen.getByText("Manage Preferences"));
    expect(rt.getSnapshot().isPreferencesOpen).toBe(true);
  });

  it("renders the iframe once the category is consented (saved decision)", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    const iframe = container.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe(SRC);
  });

  it("does NOT render on a transient toggle — only on a saved decision", () => {
    const rt = mountOffline("GDPR");
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    // Flipping the switch in the (unsaved) dialog must not load the embed.
    act(() => rt.manager.updateCategory("analytics", true));
    expect(container.querySelector("iframe")).toBeNull();
    // Saving commits it → now it loads.
    act(() => rt.manager.savePreferences());
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("latches: stays rendered after the category is revoked (reload to re-block)", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(<GatedFrame src={SRC} category="analytics" title="video" />);
    expect(container.querySelector("iframe")).not.toBeNull();
    // Revoke via a real action — the already-loaded frame must NOT swap back to
    // the placeholder mid-session.
    act(() => rt.manager.rejectAll());
    expect(container.querySelector("iframe")).not.toBeNull();
  });
});

describe("GatedFrame devtools instrumentation", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
  });

  it("records its src as managed on the devtools queue, even behind the placeholder", () => {
    process.env.NODE_ENV = "development";
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
    mountOffline("GDPR");
    render(<GatedFrame src={SRC} category="analytics" />);
    const pushed = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? []).filter(
      (e) => e.k === "s",
    );
    expect(pushed.map((e) => e.d)).toEqual([
      { id: SRC, src: SRC, category: "analytics", via: "GatedFrame" },
    ]);
  });

  it("records nothing in production", () => {
    process.env.NODE_ENV = "production";
    delete (globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__;
    mountOffline("GDPR");
    render(<GatedFrame src={SRC} category="analytics" />);
    const pushed = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ?? []).filter(
      (e) => e.k === "s",
    );
    expect(pushed).toEqual([]);
  });
});
