# Which API should I use to read consent?

There is one recommended way to read consent state per platform. Everything
else is a legitimate but low-level option for a specific edge case — you
don't need it unless the tree below sends you there.

```
Are you inside a React component?
├─ Yes → useConsent()
│         Need to gate one thing without re-rendering on every category?
│         → useConsentCategory(category) instead (low-level)
│
├─ No, but I'm in a Next.js Server Component / route handler
│         (no live runtime, no React hooks available)
│         → parseCookie() from @cookieyes/core (low-level, reads the raw
│           cookie string — see that package's README)
│
└─ No, plain JS / another framework
          → consentStore.subscribe(listener)
          Need to change consent, not just read it?
          → consentStore.getState() actions (saveConsents, setConsent, ...),
            or useConsentActions() in React
          Need to act only on *saved* changes, not every transient update?
          → subscribeToConsentChanges (low-level)
```

That's it for ~95% of use cases. The full low-level surface — `useConsentRuntime()`,
`getCookieYes()`, `onConsentReady`, `onConsentUpdate`, `subscribeToConsentChanges` —
is documented in each package's README under "Low-level / advanced API," each
with the specific situation it's for.

This file is the single source of truth for this decision tree — every
package's README links here rather than repeating it, so it can't drift out
of sync between packages.
