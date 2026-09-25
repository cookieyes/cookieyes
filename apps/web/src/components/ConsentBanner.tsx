import { TRACKING_ENABLED } from "@/lib/site";

// CookieYes banner and its Consent Mode default, synchronous in <head>, production only (see TRACKING_ENABLED).
const CONSENT_DEFAULT = `window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("consent", "default", {
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  analytics_storage: "denied",
  functionality_storage: "denied",
  personalization_storage: "denied",
  security_storage: "granted",
  wait_for_update: 2000,
});
gtag("set", "ads_data_redaction", false);
gtag("set", "url_passthrough", false);`;

const BANNER_SRC = "https://cdn-cookieyes.com/client_data/e5ee5d26e0341217ffb7eccd/script.js";

export function ConsentBanner() {
  if (!TRACKING_ENABLED) return null;
  return (
    <>
      <link rel="preconnect" href="https://cdn-cookieyes.com" />
      <link rel="preconnect" href="https://directory.cookieyes.com" />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the Consent Mode default is a fixed inline snippet, not user input. */}
      <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />
      <script id="cookieyes" type="text/javascript" src={BANNER_SRC} />
    </>
  );
}
