---
"@cookieyes/react": minor
---

Add `@cookieyes/react/critical.css` — the paint-critical banner stylesheet

`styles.css` is ~25 KB and styles every surface: banner, preferences dialog, opt-out flow,
toggles, revisit widget, reload notice. If your bundler puts it in the critical path — what
an app-root `import` normally does — the banner is already styled at first paint and you
need nothing new.

For anyone who would rather keep that 25 KB off the critical path, `critical.css` contains
only the rules needed to render the banner (~1.6 KB gzipped). Inline it in `<head>` and load
the full sheet without blocking render:

```html
<style>/* contents of @cookieyes/react/critical.css */</style>
<link rel="stylesheet" href="…/styles.css" media="print" onload="this.media='all'">
```

Every rule in it is byte-identical to the same rule in `styles.css`, enforced by a test, so
the two can never disagree about how the banner looks. It is a supplement, not a
replacement — keep importing `styles.css`, or the preferences dialog will be unstyled when a
visitor opens it.

Purely additive: `styles.css` is unchanged and existing setups need no edits.
