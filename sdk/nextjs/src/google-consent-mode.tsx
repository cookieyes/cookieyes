import { type ConsentModeOptions, googleConsentModeSnippet } from "@cookieyes/scripts";

/**
 * Renders the Google Consent Mode **deny-by-default** as an inline `<script>`,
 * to be placed high in your root layout — before any Google tag and before the
 * SDK boots. This is what lets a returning visitor's saved choice (which the SDK
 * broadcasts as a Consent Mode `update`) land on top of a clean default, instead
 * of the visitor being stuck denied until they act again.
 *
 * The `<script>` is inline and synchronous, so it runs in document order before
 * the client bundle (and before `gtag.js`, which the `ga4()`/`googleAds()`
 * loaders inject). Pass it the same {@link ConsentModeOptions} as the loaders if
 * you need to change the defaults.
 *
 * ```tsx
 * // app/layout.tsx
 * import { GoogleConsentMode } from "@cookieyes/nextjs/server";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <GoogleConsentMode />
 *         {children}
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * Then load the tags on the client with a preset from `@cookieyes/scripts`:
 * `initCookieYes({ integrations: [ga4({ measurementId: "G-XXXX" })] })`.
 */
export function GoogleConsentMode(props: ConsentModeOptions = {}) {
  return (
    <script
      // biome-ignore lint/security/noDangerouslySetInnerHtml: an inline Consent Mode default is the standard, documented Google pattern.
      dangerouslySetInnerHTML={{ __html: googleConsentModeSnippet(props) }}
    />
  );
}
