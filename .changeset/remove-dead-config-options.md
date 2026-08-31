---
"@cookieyes/core": minor
---

Remove three configuration options that were declared in the public types but read by nothing: `consentCategories`, `theme.buttonVariant`, and `theme.widgetPosition`.

None of the three ever had any effect. `consentCategories` was copied into the normalized config and then never consulted; `buttonVariant` and `widgetPosition` appeared only in the `ThemeConfig` declaration — no component, hook, or stylesheet rule read either. Because they were inert, **removing them changes no runtime behaviour**: code that set them behaved exactly as code that omitted them.

TypeScript users who passed any of the three will now see a type error. The fix is to delete the property — there is no replacement, because there was never an implementation. For the two theme fields, the styling you may have been attempting is available through the `cy-*` classes and `--cy-*` custom properties; see the styling documentation.

Also removes a dead `.cy-widget[data-pos="bottom-right"]` rule from the stylesheet. `RecallButton` always emits `data-pos="bottom-left"`, so the rule could never match. The recall widget's position is unchanged (bottom-left) and remains non-configurable.
