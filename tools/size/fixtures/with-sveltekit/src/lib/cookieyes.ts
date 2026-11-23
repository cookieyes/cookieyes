/*
 * @cookieyes/sveltekit as its README's quick start sets it up: this config module, the handle,
 * the root layout's load, <CookieYesRoot /> in the root layout and the stylesheet route. The
 * rest is the empty SvelteKit app every SvelteKit fixture shares, so the figure is the
 * integration's cost over an empty SvelteKit app, measured the same way as the others.
 */

import type { CookieYesConfig } from "@cookieyes/sveltekit";

export const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
