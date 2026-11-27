// The module the integration's Vite plugin serves to the middleware. It exists only inside an
// Astro build, so this package's own type check needs a declaration.
declare module "virtual:cookieyes/config" {
  import type { CookieYesConfig } from "@cookieyes/core";
  import type { _HeadParts } from "./head.js";

  export const config: CookieYesConfig;
  export const head: _HeadParts;
  export const dev: boolean;
}
