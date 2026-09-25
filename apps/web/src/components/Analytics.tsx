import { TRACKING_ENABLED } from "@/lib/site";
import { AnalyticsTags } from "./AnalyticsTags";

// GA4 and Microsoft Clarity, production only (see TRACKING_ENABLED).
const GA4_ID = "G-TV1HLPHV6F";
const CLARITY_ID = "ymayzj60r0";

/**
 * Whether to load the tags is decided here, on the server: TRACKING_ENABLED reads
 * environment variables the browser bundle does not have. Where they load is decided in
 * AnalyticsTags, which knows the page.
 */
export function Analytics() {
  if (!TRACKING_ENABLED) return null;
  return <AnalyticsTags ga4Id={GA4_ID} clarityId={CLARITY_ID} />;
}
