---
"@cookieyes/react": minor
---

Primary buttons now visibly darken on hover instead of only fading.

`--cy-primary-hover` has existed since the theming tokens shipped but was never consumed by any
rule — every button's hover state, including primary buttons, only faded to 80% opacity. Primary
buttons now also shift to `--cy-primary-hover` (a darker mix of your primary colour) on hover,
with the fade disabled so only the colour shift is visible — matching what the token's name always
implied it did. If you've customised `--cy-primary-hover` via the documented `!important` override,
that customisation is now visible for the first time.

This covers both primary-styled buttons: the banner's primary action and the CCPA opt-out dialog's Save button, which share the same background and text colours at rest and now share the same hover treatment.
