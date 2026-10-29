// @vitest-environment jsdom
//
// The React adapter against the shared conformance suite, in jsdom, on every
// test run. It runs here rather than in `@cookieyes/react` because this package
// already depends on React for its tests, and the reverse would make the two
// packages depend on each other. `conformance-react.browser.test.tsx` runs the
// same suite in a real browser.
import { act, fireEvent } from "@testing-library/react";
import { describe, it } from "vitest";
import { pressInDocument, runConformance } from "../conformance.js";
import { reactDriver } from "./react-driver.js";

runConformance(
  reactDriver("react (jsdom)", {
    async click(el) {
      act(() => {
        fireEvent.click(el);
      });
    },
    async press(key) {
      await act(() => pressInDocument(key));
    },
  }),
  { describe, it },
);
