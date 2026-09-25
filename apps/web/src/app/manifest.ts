import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Lets a browser install the site or pin it with the right name and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "CookieYes Dev",
    description: "Open-source consent for React and Next.js.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
