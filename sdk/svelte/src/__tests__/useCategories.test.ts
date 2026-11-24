import { DEFAULT_CATEGORIES } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useCategories } from "../hooks/useCategories.js";
import { clearCookie, cookieOnly, renderHook, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useCategories", () => {
  it("returns the built-in five by default", () => {
    const { result } = renderHook(() => useCategories(), cookieOnly());
    expect(result.ids).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
  });

  it("returns a custom taxonomy", () => {
    const { result } = renderHook(() => useCategories(), {
      mode: "cookie-only",
      categories: [
        { id: "essential", required: true, label: "Essential", description: "" },
        { id: "stats", label: "Stats", description: "" },
      ],
    });
    expect(result.ids).toEqual(["essential", "stats"]);
    expect(result.requiredIds.has("essential")).toBe(true);
  });
});
