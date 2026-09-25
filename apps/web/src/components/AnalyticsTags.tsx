"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { PLAYGROUND_PREVIEW_PATH } from "@/lib/site";

/**
 * GA4 and Microsoft Clarity, loaded after the page's load event. Not on the playground's
 * preview: it is a page inside the playground's iframe, so tagging it would count every
 * playground visit twice and record the demo banner as site traffic.
 */
export function AnalyticsTags({ ga4Id, clarityId }: { ga4Id: string; clarityId: string }) {
  const pathname = usePathname();
  if (pathname.startsWith(PLAYGROUND_PREVIEW_PATH)) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`} strategy="lazyOnload" />
      <Script id="ga4" strategy="lazyOnload">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4Id}');`}
      </Script>
      <Script id="clarity-tag" strategy="lazyOnload">
        {`(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "${clarityId}");`}
      </Script>
    </>
  );
}
