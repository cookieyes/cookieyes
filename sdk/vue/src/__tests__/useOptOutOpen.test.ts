import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import { useOptOutOpen } from "../composables/useOptOutOpen.js";
import { getCookieYes } from "../runtime.js";
import { clearCookie, cookieOnly, renderComposable, unmountAll } from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useOptOutOpen", () => {
  it("is closed by default", () => {
    const { result } = renderComposable(() => useOptOutOpen(), cookieOnly("CCPA"));
    expect(result.value).toBe(false);
  });

  it("opens and closes with the runtime", async () => {
    const { result } = renderComposable(() => useOptOutOpen(), cookieOnly("CCPA"));
    getCookieYes().showOptOut();
    await nextTick();
    expect(result.value).toBe(true);
    getCookieYes().hideOptOut();
    await nextTick();
    expect(result.value).toBe(false);
  });
});
