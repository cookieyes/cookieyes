import Script from "next/script";

// GA4 and Microsoft Clarity, production only.
const GA4_ID = "G-TV1HLPHV6F";
const CLARITY_ID = "ymayzj60r0";

export function Analytics() {
  if (process.env.NODE_ENV !== "production" || process.env.DISABLE_TRACKING === "1") return null;
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
      <Script id="clarity-tag" strategy="afterInteractive">
        {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${CLARITY_ID}");`}
      </Script>
    </>
  );
}
