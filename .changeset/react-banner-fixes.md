---
"@cookieyes/react": minor
"@cookieyes/ui": minor
---

The banner now works under a strict Content Security Policy when it is server-rendered, "Powered by" is translated, and every control in the opt-out dialog and the reload notice can be styled by part.

**Fixed: the announcement could show on the page under a strict `style-src`.** The banner's screen-reader announcer was server-rendered with an inline `style` attribute, which a policy without `'unsafe-inline'` blocks, so its text could appear as plain text on the page. It now uses the `.cy-sr-only` class from the stylesheet, which `critical.css` includes. The server-rendered banner has no inline style attributes.

**Fixed: "Powered by" is translated.** The visible words of the branding link were English in every language. They now come from the `poweredBy` translation, split around the brand name that the logo shows.

**New parts.** The opt-out dialog's `checkbox`, `checkbox-label`, `cancel`, `confirmation` and `branding`, and the reload notice's `reload` button, now carry `data-cy-part`. `CookieOptOut`'s `classNames` and `styles` accept the same names.

**Changed: two opt-out dialogs no longer share a checkbox id.** The id was the fixed `cy-ccpa-optout`; it is now generated per dialog. If your CSS or tests targeted `#cy-ccpa-optout`, use `[data-cy-part="checkbox"]` instead.

**Removed: `data-pos` on the recall button.** No stylesheet rule or setting read it.

Measured with `pnpm size`: the React banner and interface layers grow by 19 bytes of gzip and `styles.css` by 34, for the new part attributes, the translated branding and the `.cy-sr-only` rule.
