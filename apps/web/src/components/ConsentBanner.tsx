/**
 * The CookieYes banner for this site: the hosted script marketing provided, preceded by
 * the Google Consent Mode default it expects. Both are plain synchronous tags in <head>,
 * exactly as the embed code is written, so they run before any tag in the body (GA4 and
 * Clarity in Analytics.tsx load after the page is interactive). Production builds only,
 * like the tags it governs.
 */
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
gtag("set", "ads_data_redaction", true);
gtag("set", "url_passthrough", true);`;

const BANNER_SRC = "https://cdn-cookieyes.com/client_data/e5ee5d26e0341217ffb7eccd/script.js";

export function ConsentBanner() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the Consent Mode default is a fixed inline snippet, not user input. */}
      <script dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULT }} />
      <script id="cookieyes" type="text/javascript" src={BANNER_SRC} />
    </>
  );
}
