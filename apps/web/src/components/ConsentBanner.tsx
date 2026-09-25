import { PLAYGROUND_PREVIEW_PATH, TRACKING_ENABLED } from "@/lib/site";

// CookieYes banner and its Consent Mode default, at the top of <head>, production only (see TRACKING_ENABLED).
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

/**
 * Loads the banner everywhere except the playground's preview. That page runs inside an
 * iframe on the playground, and shows the SDK's own demo banner; the site's banner there
 * made two banners on screen. The root layout is shared and static, so the check runs in
 * the page. Inserted with `async = false`, the script still runs before the page's load
 * event, which is before GA4 and Clarity are added (see Analytics).
 */
const LOAD_BANNER = `(function () {
  if (location.pathname.indexOf(${JSON.stringify(PLAYGROUND_PREVIEW_PATH)}) === 0) return;
  var script = document.createElement("script");
  script.id = "cookieyes";
  script.src = ${JSON.stringify(BANNER_SRC)};
  script.async = false;
  document.head.appendChild(script);
})();`;

export function ConsentBanner() {
  if (!TRACKING_ENABLED) return null;
  return (
    <>
      <link rel="preconnect" href="https://cdn-cookieyes.com" />
      <link rel="preconnect" href="https://directory.cookieyes.com" />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the Consent Mode default is a fixed inline snippet, not user input. */}
      <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed inline loader, not user input. */}
      <script dangerouslySetInnerHTML={{ __html: LOAD_BANNER }} />
    </>
  );
}
