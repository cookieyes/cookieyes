/*
 * @cookieyes/vue as its README's quick start sets it up: the plugin, the stylesheet and one
 * component that renders the banner, the preferences dialog and the recall button. The Vite app
 * is only the control every Vue fixture shares, so the figure is the adapter's cost over an empty
 * Vue app, measured the same way as the React ones.
 */

import { CookieYes, type CookieYesConfig } from "@cookieyes/vue";
import "@cookieyes/vue/styles.css";
import type { App } from "vue";

const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };

export function setupConsent(app: App): void {
  app.use(CookieYes, config);
}
