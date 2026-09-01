import { Geist_Mono, Inter, Poppins } from "next/font/google";
import "./global.css";
import { getSearchIndex } from "@/lib/search-index";
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
      <body>
        <Providers pageIndex={getSearchIndex()}>{children}</Providers>
      </body>
    </html>
  );
}
