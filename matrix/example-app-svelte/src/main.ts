// The stylesheet import is required: the SDK ships no inline styling.
import "@cookieyes/svelte/styles.css";
import { hydrate, mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");
if (!target) throw new Error("#app is missing");
const props = { regulation: "GDPR", initialConsent: null } as const;

// Server-rendered markup is hydrated; an empty container is mounted.
if (target.hasChildNodes()) hydrate(App, { target, props });
else mount(App, { target, props });
