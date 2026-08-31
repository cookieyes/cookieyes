---
"@cookieyes/react": patch
---

Export the prop types for `<RecallButton />`, `<GatedScript />` and `<GatedFrame />` as `RecallButtonProps`, `GatedScriptProps` and `GatedFrameProps`.

All three components already accepted these props; the types were simply declared inline and unexported, so there was no public name to reference when typing a wrapper component or a helper that forwards props. The three preset components (`CookieBanner`, `CookiePreferences`, `CookieOptOut`) have always exported theirs — this brings the remaining three into line.

Additive only: no runtime behaviour changes and no existing import breaks.
