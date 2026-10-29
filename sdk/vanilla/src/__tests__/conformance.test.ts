// The vanilla banner against the same conformance suite React passes, in jsdom,
// on every test run. `conformance.browser.test.ts` runs it in a real browser.
import { runConformance } from "@cookieyes/test/conformance";
import { describe, it } from "vitest";
import { vanillaDriver } from "./driver.js";

runConformance(vanillaDriver("vanilla (jsdom)"), { describe, it });
