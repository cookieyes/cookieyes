---
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Make the components easy to restyle.

- Every component labels its pieces with `data-cy-part` (and toggles with `data-cy-state="on" | "off"`) for precise CSS targeting. The names are also exported as the typed `CY_PART` / `CY_STATE` constants.
- The styled presets (`CookieBanner`, `CookiePreferences`, `CookieOptOut`) now accept `className` / `style`, merged onto their visible card on top of the defaults.
- Control primitives accept `asChild` — render your own element and the SDK wires its behaviour (click action, `data-cy-part`, ref) onto it, composing with your own handlers/classes.

Purely additive — existing setups render identically.
