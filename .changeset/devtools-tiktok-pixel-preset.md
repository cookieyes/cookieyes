---
"@cookieyes/devtools": minor
---

The Scanner now suggests the ready-made integration for the TikTok Pixel.

**What changed.** When the Scanner finds the TikTok Pixel loading outside the SDK, the suggested fix is now `tiktokPixel({ pixelId })` from `@cookieyes/scripts`, instead of a generic `customScript()`. The `_tt_enable_cookie`, `ttcsid` and `ttclid` cookies and the `analytics-ipv6.tiktokw.us` host are recognised as TikTok's too.
