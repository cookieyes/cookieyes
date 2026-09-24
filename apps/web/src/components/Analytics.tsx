import Script from "next/script";

/**
 * Marketing's tracking tags: Google Analytics 4 and Microsoft Clarity, on every page.
 * Production builds only, so local development and previews do not show up in the
 * reports.
 *
 * Both tags set cookies as soon as they run. Before launch, the CookieYes banner for
 * developers.cookieyes.com must be loaded first in <head>; its auto-blocking and Google
 * Consent Mode then hold these two until the visitor agrees.
 */
const GA4_ID = "G-TV1HLPHV6F";
const CLARITY_ID = "ymayzj60r0";

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
      <Script id="clarity" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`}
      </Script>
    </>
  );
}
