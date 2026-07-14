import { createRoot } from "react-dom/client";
import {
  CookieBanner,
  CookieOptOut,
  CookiePreferences,
  createCookieYes,
  RecallButton,
} from "../../src/index.js";

const params = new URLSearchParams(window.location.search);
const regulation = params.get("regulation") === "CCPA" ? "CCPA" : "GDPR";
const colorScheme = params.get("colorScheme") === "dark" ? "dark" : "light";

createCookieYes().mode("offline").regulation(regulation).colorScheme(colorScheme).mount();

function Fixture() {
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
      <CookieOptOut />
      <RecallButton />
    </>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<Fixture />);
