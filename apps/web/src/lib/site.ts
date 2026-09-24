/**
 * The site's public origin, used wherever an absolute URL is written into a file that
 * crawlers read (robots.txt, sitemap.xml). Production is developers.cookieyes.com; set
 * NEXT_PUBLIC_SITE_URL on a review deployment so those files name that host instead.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://developers.cookieyes.com"
).replace(/\/+$/, "");
