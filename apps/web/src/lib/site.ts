import type { Metadata } from "next";

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

export const SITE_NAME = "CookieYes for Developers";

/**
 * A page's own metadata: its title (suffixed by the root layout's template), description,
 * canonical URL and the matching Open Graph and Twitter text.
 *
 * Next merges `openGraph` and `twitter` shallowly, so a page that sets either replaces the
 * layout's object whole, file-based card image included; this rebuilds both in full and
 * names the shared image (app/opengraph-image.tsx) itself, or only the homepage would
 * carry one.
 */
export function pageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
}: {
  title: string;
  description?: string;
  path: string;
  /** Use `title` as the whole <title>, without the site-name suffix. */
  absoluteTitle?: boolean;
}): Metadata {
  const fullTitle = absoluteTitle ? title : `${title} | ${SITE_NAME}`;
  const image = { url: "/opengraph-image", width: 1200, height: 630, alt: SITE_NAME };
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: fullTitle,
      description,
      url: path,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image] },
  };
}

/**
 * Whether this build loads the CookieYes banner, GA4 and Clarity. Only production builds
 * do, and never a Vercel preview deployment, so review traffic stays out of the GA4
 * property. DISABLE_TRACKING=1 switches them off for any other build, such as a review
 * project's own production deployment.
 */
export const TRACKING_ENABLED =
  process.env.NODE_ENV === "production" &&
  process.env.VERCEL_ENV !== "preview" &&
  process.env.DISABLE_TRACKING !== "1";

/** The page the playground loads in its iframe, which shows the SDK's own demo banner. */
export const PLAYGROUND_PREVIEW_PATH = "/playground/preview";
