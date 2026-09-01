const DOCS_URL =
  "https://github.com/cookieyes/cookieyes/blob/main/apps/web/content/docs/styling/csp.mdx";

// This SDK's own styling — the static stylesheet (a real <link>) and
// theme colors (set via the CSSOM, not a <style> block) — doesn't need
// `unsafe-inline` or a nonce under any `style-src` policy, so it can't
// itself be the source of a style-src violation. This listener is a
// safety net for anything else on the page: a customer's own inline
// styles, a third-party script, or (if we ever regress) our own code
// reintroducing inline styling — surfacing it instead of failing silently.
export function warnOnStyleCspViolations(): void {
  if (typeof document === "undefined") return;
  document.addEventListener("securitypolicyviolation", (e) => {
    if (!e.violatedDirective.startsWith("style-src")) return;
    console.warn(
      `[cookieyes] A style was blocked by your Content-Security-Policy (${e.violatedDirective}). ` +
        `CookieYes's own styling doesn't require "unsafe-inline" or a nonce, so this is likely ` +
        `unrelated to this SDK — check your own inline styles or third-party scripts. ` +
        `See ${DOCS_URL} for the exact policy this SDK needs.`,
    );
  });
}
