import { registerNetworkBlocker } from "@cookieyes/core/network-blocker";

// Imported by the generated page entry ahead of the runtime, and only when `networkBlocker.rules`
// are set in astro.config.mjs: the runtime installs a blocker only if one was registered first,
// and a site without rules must never download it.
registerNetworkBlocker();
