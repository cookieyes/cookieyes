/*
 * @cookieyes/svelte as its README's quick start sets it up: the config module, the stylesheet
 * and one component that renders the banner, the preferences dialog and the recall button. The
 * Vite app is only the control every Svelte fixture shares, so the figure is the adapter's cost
 * over an empty Svelte app, measured the same way as the Vue one.
 */

import type { CookieYesConfig } from "@cookieyes/svelte";

export const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
