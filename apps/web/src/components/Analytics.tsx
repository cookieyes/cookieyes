import Script from "next/script";

/**
 * Marketing's tracking tags: Google Analytics 4 and Microsoft Clarity, on every page,
 * in production builds only, so local development and previews do not show up in the
 * reports. The CookieYes banner (ConsentBanner.tsx, in <head>) runs first.
 *
 * GA4 loads at once and obeys the Consent Mode default the banner sets: nothing is
 * stored until the visitor agrees. Clarity ignores Consent Mode, so its tag is written
 * as `text/plain` with CookieYes's category attribute; the banner script turns it into
 * a live script only once analytics consent is given, and never runs it otherwise.
 */
const GA4_ID = "G-TV1HLPHV6F";
const CLARITY_ID = "ymayzj60r0";

const CLARITY_TAG = `(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`;

export function Analytics() {
  if (process.env.NODE_ENV !== "production") return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA4_ID}');`}
      </Script>
      <script
        id="clarity-tag"
        type="text/plain"
        data-cookieyes="cookieyes-analytics"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed vendor snippet, held as text/plain until consent.
        dangerouslySetInnerHTML={{ __html: CLARITY_TAG }}
      />
    </>
  );
}
