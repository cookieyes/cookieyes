import { registerNetworkBlocker } from "@cookieyes/core/network-blocker";
import { defineNuxtPlugin } from "nuxt/app";

/**
 * Registers the network blocker before the SDK starts, which it must: the SDK installs a blocker
 * only if one was registered. The module adds this plugin only when `networkBlocker.rules` are set
 * in nuxt.config.ts, so an app without rules never bundles the blocker. Ordered just before the
 * module's main plugin (`enforce: "pre"`, order -20).
 */
export default defineNuxtPlugin({
  name: "cookieyes:network-blocker",
  order: -21,
  setup() {
    registerNetworkBlocker();
  },
});
