---
"@cookieyes/react": minor
---

Dev-mode console warnings for low-contrast theme colours.

In development builds only (`process.env.NODE_ENV !== "production"`), the SDK now warns in the
console when your configured `textColor`/`mutedTextColor` fall below WCAG AA contrast (4.5:1)
against `backgroundColor`, checked independently for light and dark mode. Warnings name the exact
failing pair and the threshold missed. Values the SDK cannot parse (anything other than 3- or
6-digit hex) are skipped silently rather than risk a false warning. Nothing changes in production
builds — this is a new export (`contrastRatio`, internal to the package) and a new dev-only side
effect, not a behaviour change to any rendered output.
