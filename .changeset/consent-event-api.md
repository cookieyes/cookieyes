---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
---

Add a consent event API for reacting to consent changes.

- Core: `consentStore.on("save" | "change", listener, { category? })` returning an unsubscribe function.
- React / Next.js: the `useOnConsentChange(type, listener, options?)` hook (cleans up on unmount, no-op during SSR).

`change` fires only when a category actually differs; `save` fires on every save. Listeners fire once immediately with the current state (`isInitial: true`), and one throwing listener never blocks the others. Existing `subscribe`/`subscribeToConsentChanges`/`onConsentUpdate` continue to work unchanged.
