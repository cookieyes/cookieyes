// matrix/example-app-svelte/src/consent.ts
//
// One config object shared by the client entry and the server entry. The provider reuses the
// running runtime only when it is handed the same object, so the server entry must not build its
// own.

import type { CookieYesConfig } from "@cookieyes/svelte";

export const config: CookieYesConfig = { mode: "cookie-only", regulation: "GDPR" };
