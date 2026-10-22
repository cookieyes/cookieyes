// The React adapter against the shared conformance suite in real Chromium:
// real clicks, real key presses, the browser's own focus movement, and the
// real stylesheet. Run with `pnpm --filter @cookieyes/test test:browser`.
// @ts-expect-error: a stylesheet has no type declarations; Vite loads it in the browser run.
import "@cookieyes/ui/styles.css";
import { describe, it } from "vitest";
import { userEvent } from "vitest/browser";
import { runConformance } from "../conformance.js";
import { reactDriver } from "./react-driver.js";

const KEYS = { Tab: "{Tab}", "Shift+Tab": "{Shift>}{Tab}{/Shift}", Escape: "{Escape}" } as const;

runConformance(
  reactDriver("react (chromium)", {
    click: (el) => userEvent.click(el),
    press: (key) => userEvent.keyboard(KEYS[key]),
  }),
  { describe, it },
);
