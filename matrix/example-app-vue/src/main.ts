// The stylesheet import is required: the SDK ships no inline styling.
import "@cookieyes/vue/styles.css";
import { CookieYes } from "@cookieyes/vue";
import { createApp } from "vue";
import App from "./App.vue";
import { config } from "./consent";

createApp(App, { regulation: "GDPR", initialConsent: null }).use(CookieYes, config).mount("#app");
