/**
 * The site's public origin, used wherever an absolute URL is written into a file that
 * crawlers read (robots.txt, sitemap.xml, llms.txt, the agent catalog and skills).
 *
 * Resolution order: NEXT_PUBLIC_SITE_URL when set; otherwise the deployment's own
 * production domain, which Vercel provides at build time, so a review deployment names
 * its own host and the real project names developers.cookieyes.com; otherwise that
 * domain. A file that names another host fails every crawler's same-host check.
 */
const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (vercelHost ? `https://${vercelHost}` : "https://developers.cookieyes.com")
).replace(/\/+$/, "");
