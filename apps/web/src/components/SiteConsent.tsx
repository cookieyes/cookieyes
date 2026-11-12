"use client";

import { CookieBanner, CookiePreferences, initCookieYes, RecallButton } from "@cookieyes/nextjs";
import { clarity, ga4 } from "@cookieyes/scripts";
import "@cookieyes/nextjs/styles.css";
import { usePathname } from "next/navigation";
import { PLAYGROUND_PREVIEW_PATH } from "@/lib/site";

const GA4_ID = "G-TV1HLPHV6F";
const CLARITY_ID = "ymayzj60r0";

let started = false;

/**
 * Started from the component rather than at module scope. The playground's preview page
 * shares this layout and runs its own runtime behind an ephemeral cookie jar that must be
 * installed before the SDK first reads `document.cookie`; a module-scope call here would run
 * first and point the shared singleton at the real cookie.
 */
function start(tracking: boolean): void {
  if (started) return;
  started = true;
  initCookieYes({
    mode: "cookie-only",
    regulation: "GDPR",
    // "basic" keeps gtag.js off the page until analytics is granted, instead of loading it
    // at once behind Consent Mode.
    integrations: tracking
      ? [ga4({ measurementId: GA4_ID, consentMode: "basic" }), clarity({ projectId: CLARITY_ID })]
      : [],
  });
}

/**
 * The site's own cookie consent, run on the SDK it documents. The banner shows in every
 * environment; GA4 and Clarity are added only where `tracking` is set (see TRACKING_ENABLED).
 * Not on the playground's preview, which shows the SDK's demo banner instead.
 */
export function SiteConsent({ tracking }: { tracking: boolean }) {
  const pathname = usePathname();
  if (pathname.startsWith(PLAYGROUND_PREVIEW_PATH)) return null;
  start(tracking);
  return (
    <>
      <CookieBanner />
      <CookiePreferences />
      <RecallButton />
    </>
  );
}
