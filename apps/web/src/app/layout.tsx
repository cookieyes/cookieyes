import type { Metadata } from "next";
import { Geist_Mono, Inter, Poppins } from "next/font/google";
import "./global.css";
import { Analytics } from "@/components/Analytics";
import { ConsentBanner } from "@/components/ConsentBanner";
import { getSearchIndex } from "@/lib/search-index";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { Providers } from "./Providers";

/**
 * Inter carries body and UI text, Poppins the display headings — the two families the
 * CookieYes design system is built on. Loaded here so they are self-hosted and the page
 * makes no third-party font request.
 */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

/**
 * Geist Mono carries code blocks, inline code, and the docs' micro-labels (breadcrumbs,
 * TOC eyebrow, page meta). The docs design specifies it throughout; the landing page
 * does not use it, but loading it here keeps every face on one self-hosted path.
 */
const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-geist-mono",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

/**
 * Defaults every page inherits: absolute URLs resolve against the public origin, a page's
 * own title is suffixed with the site name, and links shared on Slack, X or LinkedIn get a
 * card with the shared image in app/opengraph-image.tsx. Each page sets its own canonical.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  openGraph: { siteName: SITE_NAME, type: "website", locale: "en_US" },
  twitter: { card: "summary_large_image" },
};

/**
 * Root layout. Exposes both font families as CSS variables, which the design system's
 * tokens and the page styles reference by name.
 *
 * Providers supplies the search dialog, sidebar state, and theme context that the
 * docs layout needs, and feeds the search dialog its page index. It brings
 * next-themes, which writes a class onto <html> — hence suppressHydrationWarning. The landing page picks its own light/dark per band via
 * .cy-band-* classes, so the theme class does not affect it.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ConsentBanner />
      </head>
      <body>
        <Providers pageIndex={getSearchIndex()}>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
