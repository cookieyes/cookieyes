// matrix/example-app-vue/src/consent.ts
//
// One config object shared by the client entry and the server entry. The plugin reuses the running
// runtime only when it is handed the same object, so the server entry must not build its own.

import type { CookieYesConfig } from "@cookieyes/vue";

export const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
