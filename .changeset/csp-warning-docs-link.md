---
"@cookieyes/react": patch
---

Point the blocked-style console warning at the published CSP documentation instead of a GitHub README anchor.

When a `style-src` violation is detected the SDK warns and links to the policy it needs. That link pointed at `github.com/cookieyes/cookieyes/tree/main/sdk/react#content-security-policy`; it now points at the documentation site, which covers the same ground plus the case where an inlined `critical.css` needs its own hash or nonce. Message text is otherwise unchanged.
