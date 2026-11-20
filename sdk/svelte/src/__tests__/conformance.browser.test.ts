// The Svelte adapter against the conformance suite in real Chromium: real clicks, real key
// presses, the browser's own focus movement, and the real stylesheet. Run with
// `pnpm --filter @cookieyes/svelte test:browser`.
// @ts-expect-error: a stylesheet has no type declarations; Vite loads it in the browser run.
import "@cookieyes/ui/styles.css";
import { runConformance } from "@cookieyes/test/conformance";
import { describe, it } from "vitest";
import { userEvent } from "vitest/browser";
import { svelteDriver } from "./driver.js";

const KEYS = { Tab: "{Tab}", "Shift+Tab": "{Shift>}{Tab}{/Shift}", Escape: "{Escape}" } as const;

runConformance(
  svelteDriver("svelte (chromium)", {
    click: (el) => userEvent.click(el),
    press: (key) => userEvent.keyboard(KEYS[key]),
  }),
  { describe, it },
);
