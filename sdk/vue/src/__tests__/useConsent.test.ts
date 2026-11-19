import { flushPromises } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { effectScope } from "vue";
import { useConsent } from "../composables/useConsent.js";
import { getCookieYes } from "../runtime.js";
import {
  clearCookie,
  cookieOnly,
  installOnly,
  renderComposable,
  unmountAll,
} from "./test-utils.js";

beforeEach(clearCookie);
afterEach(unmountAll);

describe("useConsent", () => {
  it("reflects the runtime and updates on action", async () => {
    const { result } = renderComposable(() => useConsent(), cookieOnly("GDPR"));
    expect(result.value.regulation).toBe("GDPR");
    expect(result.value.hasActed).toBe(false);
    expect(result.value.categories.necessary).toBe(true);

    getCookieYes().manager.acceptAll();
    await flushPromises();
    expect(result.value.hasActed).toBe(true);
    expect(result.value.categories.analytics).toBe(true);
  });

  it("works in an effect scope under app.runWithContext", () => {
    const app = installOnly(cookieOnly("CCPA"));
    const scope = effectScope();
    const consent = app.runWithContext(() => scope.run(() => useConsent()));
    expect(consent?.value.regulation).toBe("CCPA");
    getCookieYes().manager.rejectAll();
    expect(consent?.value.hasActed).toBe(true);
    scope.stop();
  });
});
