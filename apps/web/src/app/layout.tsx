import "./global.css";
import { Inter, Poppins } from "next/font/google";

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

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

/**
 * Root layout. Exposes both font families as CSS variables, which the design system's
 * tokens and the page styles reference by name.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body>{children}</body>
    </html>
  );
}
