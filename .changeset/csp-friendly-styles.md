---
"@cookieyes/react": minor
"@cookieyes/cli": patch
---

Fix the banner, dialogs, and theme colors breaking under a strict
`style-src` Content Security Policy (e.g. `style-src 'self'`, with no
`unsafe-inline` and no nonce):

- The static stylesheet is now a real file, exposed as
  `@cookieyes/react/styles.css` — import it once per app. It no longer
  gets auto-injected as a `<style>` block, which is what a strict CSP
  blocked.
- Theme colors from `.theme(...)` are applied via `element.style.setProperty(...)`
  instead of a generated `<style>` block, so custom colors and dark/light
  mode keep working under any `style-src` policy, with no nonce needed.
- If some other style on the page is still blocked, a console warning
  now explains what happened instead of failing silently.
- The CLI's scaffolded projects (`react` and `nextjs` flows) now include
  the required stylesheet import.

**Action required:** add `import "@cookieyes/react/styles.css";` once in
your app (wherever you mount `<CookieYesRoot />`) — without it, the
banner and dialogs render unstyled.
