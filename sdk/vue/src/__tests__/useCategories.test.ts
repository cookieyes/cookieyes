import { DEFAULT_CATEGORIES } from "@cookieyes/core";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useCategories } from "../composables/useCategories.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useCategories", () => {
  it("returns the built-in five by default", () => {
    const { result } = renderComposable(() => useCategories(), cookieOnly());
    expect(result.value.ids).toEqual(DEFAULT_CATEGORIES.map((c) => c.id));
  });

  it("returns a custom taxonomy", () => {
    const { result } = renderComposable(() => useCategories(), {
      mode: "cookie-only",
      categories: [
        { id: "essential", required: true, label: "Essential", description: "" },
        { id: "stats", label: "Stats", description: "" },
      ],
    });
    expect(result.value.ids).toEqual(["essential", "stats"]);
    expect(result.value.requiredIds.has("essential")).toBe(true);
  });
});
