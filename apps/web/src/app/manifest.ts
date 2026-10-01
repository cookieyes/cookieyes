import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/site";

// Lets a browser install the site or pin it with the right name and icon.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "CookieYes Dev",
    description: "Open-source cookie consent SDK for React and Next.js.",
    start_url: "/",
    display: "browser",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
