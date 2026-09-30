import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

/** A release page's address is its release date: `/docs/changelog/2026-09-18`. */
const RELEASE_URL = /^\/docs\/changelog\/(\d{4}-\d{2}-\d{2})$/;

// The landing page, the playground and every docs page. The banner preview under
// /playground is noindex and stays out.
//
// `lastModified` only where the date is real: a release page is dated by its release,
// and the changelog index changes whenever a release is added. Other pages carry none —
// CI checks out shallow, so there is no trustworthy per-page history, and a build date
// on every URL would tell crawlers everything changed on every deploy.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/playground", ...source.getPages().map((page) => page.url)];
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
