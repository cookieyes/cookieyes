import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { source } from "@/lib/source";

// The landing page, the playground and every docs page. The banner preview under
// /playground is noindex and stays out.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["/", "/playground", ...source.getPages().map((page) => page.url)];
  return paths.map((path) => ({ url: `${SITE_URL}${path}` }));
}
