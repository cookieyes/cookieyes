import { cookieyesHandle } from "@cookieyes/sveltekit";
import { config } from "./lib/cookieyes";

export const handle = cookieyesHandle({ ...config, googleConsentMode: true });
