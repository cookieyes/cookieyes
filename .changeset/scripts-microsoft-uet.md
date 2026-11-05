---
"@cookieyes/scripts": minor
---

New integration: Microsoft Advertising UET, consent-gated, with Microsoft's consent signal.

**What changed.** `microsoftUet({ tagId })` loads the UET tag after the visitor grants the advertising category, with `consent default granted` pushed before the tag starts. On withdrawal it pushes `consent update denied`, silences the running tag, sets Microsoft's `_uetmsdns` cookie so the next page load sends nothing either, and deletes the `_uet*` cookies and their localStorage copies. No reload, and the tag is never loaded twice. A visitor whose region resolves to CCPA gets the `_uetmsdns` cookie in the denied state, the same way Meta Pixel gets Limited Data Use; `restrictDataSharing` forces it on or off.

`consentMode: "advanced"` is Microsoft's recommended setup instead: the tag loads on every page with consent denied by default and sends cookieless beacons before any decision. `uetEvent()` sends a custom event and `uetPageLoad()` a page load; both do nothing until UET is on the page.
