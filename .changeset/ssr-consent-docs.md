---
"@cookieyes/cli": patch
---

Point the generated Next.js layout at the returning-visitor setup

The scaffolded `app/layout.tsx` is a Server Component, which is where a returning visitor's stored
consent has to be read. It now carries a short comment explaining that by default the banner is
rendered for everyone and removed after hydration — which returning visitors see as it appearing and
then vanishing — and linking to the `@cookieyes/nextjs` README section that shows how to avoid it
with `getServerConsent()`.

No change to what the scaffold does; the generated app behaves exactly as before.
