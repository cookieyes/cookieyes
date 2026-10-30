import { afterEach, describe, expect, it, vi } from "vitest";
import { categoryText } from "../state/category-text.js";
import {
  initialOptOutState,
  OPT_OUT_COUNTDOWN_SECONDS,
  optOutReducer,
  startOptOutCountdown,
} from "../state/opt-out.js";
import { isBannerVisible, isRecallVisible, type SurfaceState } from "../state/visibility.js";

const fresh: SurfaceState = {
  hasActed: false,
  isBannerDismissed: false,
  isPreferencesOpen: false,
  isOptOutOpen: false,
};

describe("isBannerVisible", () => {
  it("shows until a decision or a close, and steps aside for either dialog", () => {
    expect(isBannerVisible(fresh)).toBe(true);
    expect(isBannerVisible({ ...fresh, hasActed: true })).toBe(false);
    expect(isBannerVisible({ ...fresh, isBannerDismissed: true })).toBe(false);
    expect(isBannerVisible({ ...fresh, isPreferencesOpen: true })).toBe(false);
    expect(isBannerVisible({ ...fresh, isOptOutOpen: true })).toBe(false);
  });
});

describe("isRecallVisible", () => {
  it("matches the recorded rules for GDPR and CCPA", () => {
    expect(isRecallVisible(fresh, "GDPR")).toBe(false);
    expect(isRecallVisible({ ...fresh, hasActed: true }, "GDPR")).toBe(true);
    expect(isRecallVisible({ ...fresh, isBannerDismissed: true }, "GDPR")).toBe(true);
    expect(isRecallVisible({ ...fresh, hasActed: true, isPreferencesOpen: true }, "GDPR")).toBe(
      false,
    );
    expect(isRecallVisible(fresh, "CCPA")).toBe(false);
    expect(isRecallVisible({ ...fresh, isBannerDismissed: true }, "CCPA")).toBe(true);
    expect(isRecallVisible({ ...fresh, isBannerDismissed: true, isOptOutOpen: true }, "CCPA")).toBe(
      false,
    );
  });
});

describe("categoryText", () => {
  it("prefers the site's translation, then the configuration, then the default, then the id", () => {
    const sources = {
      translated: { label: "Analyse" },
      configured: { label: "Stats", description: "Configured" },
      defaults: { label: "Analytics", description: "Default" },
    };
    expect(categoryText("analytics", sources)).toEqual({
      label: "Analyse",
      description: "Configured",
    });
    expect(categoryText("analytics", { defaults: sources.defaults })).toEqual({
      label: "Analytics",
      description: "Default",
    });
    expect(categoryText("custom", {})).toEqual({ label: "custom", description: "" });
  });
});

describe("optOutReducer", () => {
  it("opens ticked when analytics is not granted", () => {
    expect(initialOptOutState({ analytics: false }).optedOut).toBe(true);
    expect(initialOptOutState({ analytics: true }).optedOut).toBe(false);
    expect(initialOptOutState({}).optedOut).toBe(true);
  });

  it("toggles until confirmed, then locks the box and counts down", () => {
    let s = initialOptOutState({ analytics: true });
    s = optOutReducer(s, { type: "toggle", optedOut: true });
    expect(s.optedOut).toBe(true);
    s = optOutReducer(s, { type: "confirm" });
    expect(s).toEqual({ optedOut: true, confirmed: true, secondsLeft: OPT_OUT_COUNTDOWN_SECONDS });
    expect(optOutReducer(s, { type: "toggle", optedOut: false })).toBe(s);
    expect(optOutReducer(s, { type: "tick", secondsLeft: 3 }).secondsLeft).toBe(3);
  });

  it("starts over when the dialog opens again", () => {
    const confirmed = optOutReducer(initialOptOutState({}), { type: "confirm" });
    expect(optOutReducer(confirmed, { type: "open", categories: { analytics: true } })).toEqual(
      initialOptOutState({ analytics: true }),
    );
  });
});

describe("startOptOutCountdown", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("ticks once a second and finishes at zero", () => {
    vi.useFakeTimers();
    const ticks: number[] = [];
    const done = vi.fn();
    startOptOutCountdown((left) => ticks.push(left), done);
    vi.advanceTimersByTime(OPT_OUT_COUNTDOWN_SECONDS * 1000 - 1);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(done).toHaveBeenCalledTimes(1);
    expect(ticks).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]);
    vi.advanceTimersByTime(5000);
    expect(ticks).toHaveLength(10);
  });

  it("stops when cancelled", () => {
    vi.useFakeTimers();
    const done = vi.fn();
    startOptOutCountdown(() => undefined, done)();
    vi.advanceTimersByTime(OPT_OUT_COUNTDOWN_SECONDS * 1000);
    expect(done).not.toHaveBeenCalled();
  });
});
