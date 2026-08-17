import { describe, expect, it } from "vitest";
import { GoogleConsentMode } from "../google-consent-mode.js";

const html = (el: ReturnType<typeof GoogleConsentMode>) =>
  (el.props as { dangerouslySetInnerHTML: { __html: string } }).dangerouslySetInnerHTML.__html;

describe("GoogleConsentMode", () => {
  it("renders an inline deny-by-default consent-mode script", () => {
    const el = GoogleConsentMode();
    expect(el.type).toBe("script");
    expect(html(el)).toContain("gtag('consent','default'");
    expect(html(el)).toContain('"analytics_storage":"denied"');
    expect(html(el)).toContain('"security_storage":"granted"');
  });

  it("passes Consent Mode options through", () => {
    const el = GoogleConsentMode({ defaults: { analytics_storage: "granted" }, waitForUpdate: 1000 });
    expect(html(el)).toContain('"analytics_storage":"granted"');
    expect(html(el)).toContain('"wait_for_update":1000');
  });
});
