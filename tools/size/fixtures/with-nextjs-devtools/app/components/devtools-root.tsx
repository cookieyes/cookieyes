"use client";

/*
 * The one difference from with-nextjs: mounting <CookieYesDevtools/>. In
 * `next build` (a production build), package.json's conditional exports
 * (AD-1) resolve @cookieyes/devtools's stub entry — a function that renders
 * null and touches no React state, no @cookieyes/core, no @cookieyes/react —
 * so this import should contribute ~0 bytes beyond the stub module wrapper
 * itself. That claim is what tools/size/measure.mjs's "devtools" budget
 * entry and content check (A2) exist to prove, not assert.
 */

import { CookieYesDevtools } from "@cookieyes/devtools";
// Imported as the docs say to, so the content check below proves the
// stylesheet is stubbed out of production too, not only the JS.
import "@cookieyes/devtools/styles.css";

export function DevtoolsRoot() {
  return <CookieYesDevtools position="bottom-right" />;
}
