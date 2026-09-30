import type { MetadataRoute } from "next";
import { canonicalDocsPath } from "@/lib/canonical-docs";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

/** A release page's address is its release date: `/docs/changelog/2026-09-18`. */
const RELEASE_URL = /^\/docs\/changelog\/(\d{4}-\d{2}-\d{2})$/;

// The landing page, the playground and every docs page that is its own canonical. The banner preview under
// /playground is noindex and stays out.
//
// `lastModified` only where the date is real: a release page is dated by its release,
// and the changelog index changes whenever a release is added. Other pages carry none —
// CI checks out shallow, so there is no trustworthy per-page history, and a build date
// on every URL would tell crawlers everything changed on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  // Only canonical URLs: a Next.js page that points its canonical at its React twin is
  // left out, so the sitemap never lists a URL the page itself says not to index.
  const docs = source
    .getPages()
    .filter((page) => canonicalDocsPath(page) === page.url)
    .map((page) => page.url);
  const paths = ["/", "/playground", ...docs];
  const releaseDates = paths
    .map((path) => RELEASE_URL.exec(path)?.[1])
    .filter((date): date is string => date !== undefined)
    .sort();
  const latestRelease = releaseDates.at(-1);

  return paths.map((path) => {
    const date =
      RELEASE_URL.exec(path)?.[1] ?? (path === "/docs/changelog" ? latestRelease : undefined);
    return { url: `${SITE_URL}${path}`, ...(date ? { lastModified: date } : {}) };
  });
}
