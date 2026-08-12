---
"@cookieyes/react": patch
---

Minify the shipped stylesheets

`dist/styles.css` was copied verbatim from source, so consumers downloaded the source comments —
and the source is deliberately heavily commented, because several rules encode non-obvious
reasoning. The build now strips comments and collapses whitespace, taking `styles.css` from 4.80 KB
to 3.68 KB gzipped.

The transform is deliberately conservative — comment removal and whitespace collapsing only, no
value shortening, no rule merging, no reordering — so it cannot change what the CSS means. Space
after `:` is even left intact, since collapsing it is only safe inside a declaration and not in a
selector. It is verified by tests asserting every declaration survives, braces stay balanced, and
the constructs this sheet relies on (`calc()`, `color-mix()`, quoted font names, `:where()`,
attribute selectors) come through unchanged.

Net effect of this release on what an existing consumer downloads: **0.87 KB gzipped smaller**, with
the SSR, first-paint and consent-isolation work included.
