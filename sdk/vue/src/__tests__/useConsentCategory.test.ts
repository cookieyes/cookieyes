import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ref } from "vue";
import { useConsentCategory } from "../composables/useConsentCategory.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useConsentCategory", () => {
  it("is false for non-necessary categories before consent", () => {
    const { result } = renderComposable(() => useConsentCategory("analytics"), cookieOnly());
    expect(result.value).toBe(false);
  });

  it("is true for necessary, always", () => {
    const { result } = renderComposable(() => useConsentCategory("necessary"), cookieOnly());
    expect(result.value).toBe(true);
  });

  it("becomes true once the category is granted", () => {
    const { result } = renderComposable(() => useConsentCategory("analytics"), cookieOnly());
    getCookieYes().manager.acceptAll();
    expect(result.value).toBe(true);
  });

  it("ignores an unsaved toggle", () => {
    const { result } = renderComposable(() => useConsentCategory("analytics"), cookieOnly());
    getCookieYes().manager.updateCategory("analytics", true);
    expect(result.value).toBe(false);
  });

  it("follows a ref argument", () => {
    const category = ref("analytics");
    const { result } = renderComposable(() => useConsentCategory(category), cookieOnly());
    getCookieYes().manager.acceptSelected(["analytics"]);
    expect(result.value).toBe(true);
    category.value = "advertisement";
    expect(result.value).toBe(false);
  });

  it("follows a getter argument", () => {
    let name = "necessary";
    const { result } = renderComposable(() => useConsentCategory(() => name), cookieOnly());
    expect(result.value).toBe(true);
    name = "analytics";
    getCookieYes().manager.rejectAll();
    expect(result.value).toBe(false);
  });
});
