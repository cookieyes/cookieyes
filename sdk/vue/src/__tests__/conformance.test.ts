// The Vue adapter against the same conformance suite React and vanilla pass, in jsdom, on every
// test run. `conformance.browser.test.ts` runs it in a real browser.
import { runConformance } from "@cookieyes/test/conformance";
import { describe, it } from "vitest";
import { vueDriver } from "./driver.js";

runConformance(vueDriver("vue (jsdom)"), { describe, it });
