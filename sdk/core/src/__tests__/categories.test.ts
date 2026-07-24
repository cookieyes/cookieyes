import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CATEGORIES, resolveCategories } from "../categories.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveCategories", () => {
  it("returns the built-in five when nothing is configured", () => {
    const r = resolveCategories();
    expect(r.isDefault).toBe(true);
    expect(r.ids).toEqual(["necessary", "functional", "analytics", "performance", "advertisement"]);
    expect(r.requiredIds.has("necessary")).toBe(true);
  });

  it("treats an empty array as no config (default five)", () => {
    expect(resolveCategories([]).isDefault).toBe(true);
  });

  it("accepts a valid custom taxonomy", () => {
    const r = resolveCategories([
      { id: "essential", required: true },
      { id: "marketing" },
      { id: "stats" },
    ]);
    expect(r.isDefault).toBe(false);
    expect(r.ids).toEqual(["essential", "marketing", "stats"]);
    expect(r.requiredIds.has("essential")).toBe(true);
  });

  it("marks the required category explicitly, not by name", () => {
    // 'necessary' present but NOT flagged required; 'core' is the required one.
    const r = resolveCategories([{ id: "core", required: true }, { id: "necessary" }]);
    expect(r.requiredIds.has("core")).toBe(true);
    expect(r.requiredIds.has("necessary")).toBe(false);
  });

  it("falls back to the five (with a warning) when no category is required", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const r = resolveCategories([{ id: "a" }, { id: "b" }]);
    expect(r.isDefault).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("required");
  });

  it("falls back (with a warning) on duplicate ids", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const r = resolveCategories([{ id: "x", required: true }, { id: "x" }]);
    expect(r.isDefault).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0]?.[0]).toContain("unique");
  });

  it.each(["consent", "tax", "action", "consentid", "lastRenewedDate"])(
    "falls back (with a warning) when a category id collides with reserved cookie key %s",
    (reserved) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const r = resolveCategories([{ id: reserved, required: true }, { id: "analytics" }]);
      expect(r.isDefault).toBe(true);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toContain("reserved");
    },
  );

  it.each(["a:b", "a,b", "id:", ",leading"])(
    "falls back (with a warning) when an id contains a cookie delimiter (%s)",
    (badId) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
      const r = resolveCategories([{ id: badId, required: true }, { id: "ok" }]);
      expect(r.isDefault).toBe(true);
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(/',' or ':'/);
    },
  );

  it("accepts ids with spaces or unicode (they round-trip through the cookie)", () => {
    const r = resolveCategories([{ id: "café pro", required: true }, { id: "with space" }]);
    expect(r.isDefault).toBe(false);
    expect(r.ids).toEqual(["café pro", "with space"]);
  });

  it("falls back (with a warning) on an empty id", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const r = resolveCategories([{ id: "", required: true }]);
    expect(r.isDefault).toBe(true);
    expect(warn).toHaveBeenCalledOnce();
  });

  it("produces a stable hash for the same taxonomy and different for changes", () => {
    const a = resolveCategories([{ id: "x", required: true }, { id: "y" }]);
    const b = resolveCategories([{ id: "x", required: true }, { id: "y" }]);
    const c = resolveCategories([{ id: "x", required: true }, { id: "z" }]);
    expect(a.taxonomyHash).toBe(b.taxonomyHash);
    expect(a.taxonomyHash).not.toBe(c.taxonomyHash);
  });

  it("the default taxonomy hash is stable across calls", () => {
    expect(resolveCategories().taxonomyHash).toBe(
      resolveCategories(DEFAULT_CATEGORIES).taxonomyHash,
    );
  });

  it("changing a gcm mapping changes the hash (re-request trigger)", () => {
    const a = resolveCategories([
      { id: "n", required: true },
      { id: "ads", gcm: ["ad_storage"] },
    ]);
    const b = resolveCategories([
      { id: "n", required: true },
      { id: "ads", gcm: ["ad_storage", "ad_user_data"] },
    ]);
    expect(a.taxonomyHash).not.toBe(b.taxonomyHash);
  });
});
