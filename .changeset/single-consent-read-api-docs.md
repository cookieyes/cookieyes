---
"@cookieyes/core": patch
"@cookieyes/react": patch
"@cookieyes/nextjs": patch
---

Document one recommended way to read consent per platform — `useConsent()`
for React, `consentStore.subscribe` for core/non-React — and move the other
seven near-equivalent APIs into a clearly labeled "Low-level / advanced API"
section in each README, each documented with the specific situation it's for.

Adds a shared decision tree (`docs/which-api-should-i-use.md`) referenced by
every package's README instead of being copy-pasted, plus short in-editor
JSDoc pointers on the low-level exports toward the recommended primary API.

No behavior change — all existing APIs continue to work exactly as before.
This is a documentation and guidance change only.
