import { describe, expect, it } from "vitest";
import * as core from "../index.js";

/** Guards the public surface of the engine that every adapter imports from. */
describe("@cookieyes/core public exports", () => {
  const EXPECTED = [
    "getOrCreateConsentRuntime",
    "resetConsentRuntime",
    "createConsentManager",
    "generateConsentId",
    "parseCookie",
    "serializeCookie",
    "defaultTranslations",
    "resolveTranslations",
    "installNetworkBlocker",
    "uninstallNetworkBlocker",
  ] as const;

  it.each(EXPECTED)("exports %s", (name) => {
    expect(core[name as keyof typeof core]).toBeDefined();
  });
});
