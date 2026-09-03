---
"@cookieyes/react": patch
---

Correct the README's SSR-safety claim. It stated without qualification that all hooks are SSR-safe and fall back to a stable snapshot when no runtime is mounted. That is true of every hook that reads consent state, and false for the two that hand back the runtime itself: `useConsentRuntime()` is a direct pass-through to `getCookieYes()`, which throws when no runtime is registered rather than returning a fallback.

The distinction is deliberate — there is no honest default for "give me the runtime" when there isn't one, and a fake one would fail later and less clearly. But a developer who trusted the README and called `useConsentRuntime()` in a server-rendered component got a crash where they had been promised a fallback, with nothing in our documentation to suggest the fault was ours.

Registration is not guarded by an environment check, so whether a runtime exists during a server render depends on whether the `initCookieYes()` module was evaluated for the tree being rendered — which is what makes this succeed on one route and throw on another. The README now states the rule with its two exceptions, quotes the error text so it is searchable, and says plainly not to read the runtime while server rendering. Documentation only; no behaviour change.
