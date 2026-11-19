import { createApp } from "vue";
import App from "./App.vue";
import { setupConsent } from "./consent-manager";

const app = createApp(App);
setupConsent(app);
app.mount("#app");
