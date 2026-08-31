---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/translations": minor
---

Make nine previously hardcoded English strings translatable. Until now a fully translated site still announced these in English to screen reader users, and showed English text inside an otherwise translated interface.

The strings are: the visible "Always Active" label shown on a required category; the accessible names of the preferences dialog, the opt-out dialog and the floating recall button; both pieces of `<GatedFrame />`'s blocked-content placeholder; and the accessible names of the three close buttons — on the banner (rendered under CCPA), the preferences dialog and the opt-out dialog.

The close buttons were the most consequential of the nine. Each renders only an `aria-hidden` icon, so the hardcoded English label was the button's entire accessible name — on a fully translated site, a screen reader still announced "Close".

Nine keys are added to `TranslationMap` — `alwaysActive`, `preferencesDialogLabel`, `optOutDialogLabel`, `recallButtonLabel`, `bannerCloseLabel`, `preferencesCloseLabel`, `optOutCloseLabel`, and a `gatedFrame` group holding `placeholder` and `action` — and all five shipped languages (English, German, Spanish, French, Italian) supply them. `gatedFrame.placeholder` substitutes `{category}`, following the same placeholder convention as `optOut.successCountdown`'s `{seconds}`.

The recall button's tooltip was a second, separate hardcoded copy of its label; it now reads the same key.

Because the keys are required on `TranslationMap`, every shipped language must supply them — a missing translation is a build error rather than a silent English fallback. If you declare a full `TranslationMap` of your own you will need to add the nine keys; if you pass a partial object to `i18n.messages` (the usual case) nothing changes, and anything you omit still falls back to English.
