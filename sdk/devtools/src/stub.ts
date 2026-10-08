"use client";

import type { CookieYesDevtoolsProps } from "./types.js";

export type {
  CookieYesDevtoolsProps,
  DevtoolsPosition,
  DevtoolsTheme,
  TabId,
} from "./types.js";

/**
 * The default/production conditional-export target (AD-1). Resolved whenever
 * a bundler does NOT set the `development` condition — i.e. every production
 * build. Deliberately touches nothing: no React state, no
 * `useSyncExternalStore`, no `@cookieyes/core`/`@cookieyes/react` import — so
 * this module and everything it imports contributes as close to zero bytes as
 * a real, always-present export can (see amendment A1). There is intentionally
 * no runtime `NODE_ENV`/`disabled`-prop fallback here: conditional exports are
 * the *only* exclusion mechanism in v1, because a fallback path that can run
 * in production is a path a future change could accidentally reactivate.
 */
export function CookieYesDevtools(_props?: CookieYesDevtoolsProps): null {
  return null;
}
