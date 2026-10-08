"use client";

/**
 * The `"development"` conditional-export target (AD-1) — resolved only when
 * a bundler sets the `development` condition (a dev server / `next dev`). A
 * production build resolves `stub.ts` instead; see the package's `exports`
 * map and `stub.ts` for the no-op twin this file's real implementation never
 * reaches in production.
 */
export { CookieYesDevtools } from "./devtools.js";
export type {
  CookieYesDevtoolsProps,
  DevtoolsPosition,
  DevtoolsTheme,
  TabId,
} from "./types.js";
