import { describe, expect, it } from "vitest";
import * as pkg from "../index.js";

/** Functions both entry points expose. */
const SHARED_FUNCTIONS = ["coreVersionWarning", "seedConsentCookie"] as const;
/** Non-function values, listed separately so the typeof assertions stay honest. */
const CONSTANTS = ["SUPPORTED_CORE_RANGE"] as const;

/** Guards the public surface consumers install this package for. */
describe("@cookieyes/test public exports", () => {
  const FUNCTIONS = ["createConsentTest", "resetConsentTestState", ...SHARED_FUNCTIONS] as const;
  const EXPECTED = [...FUNCTIONS, ...CONSTANTS];

  it.each(FUNCTIONS)("exports %s", (name) => {
    expect(typeof pkg[name]).toBe("function");
  });

  it("exports SUPPORTED_CORE_RANGE as a semver range string", () => {
    expect(pkg.SUPPORTED_CORE_RANGE).toMatch(/^>=\d+\.\d+\.\d+ <\d+\.\d+\.\d+$/);
  });

  it("exports nothing beyond the documented surface", () => {
    expect(Object.keys(pkg).sort()).toEqual([...EXPECTED].sort());
  });
});

/** Guards the React entry point's surface. Imported lazily so the assertions
 *  above still run for anyone who has not installed React. */
describe("@cookieyes/test/react public exports", () => {
  const FUNCTIONS = [
    "createReactConsentTest",
    "resetReactConsentTestState",
    ...SHARED_FUNCTIONS,
  ] as const;
  const EXPECTED = [...FUNCTIONS, ...CONSTANTS];

  it("exports exactly the documented surface", async () => {
    const reactEntry = await import("../react.js");
    expect(Object.keys(reactEntry).sort()).toEqual([...EXPECTED].sort());
    for (const name of FUNCTIONS) {
      expect(typeof reactEntry[name]).toBe("function");
    }
  });
});
