# Devtools instrumentation

How `@cookieyes/core`, `@cookieyes/react` and `@cookieyes/scripts` tell `@cookieyes/devtools`
what they are doing, and what must stay true for the panel, especially the Scanner, to be right.

## What it guarantees

**Nothing in production.** Every report is a push onto the global array
`globalThis.__COOKIEYES_DEVTOOLS__` inside `if (process.env.NODE_ENV !== "production")`, written as
that exact literal so bundlers delete the block. Core imports nothing devtools-specific. `pnpm size`
checks a production build with the panel mounted, for both bytes and the panel's marker strings;
after adding a push, check that the production chunk does not contain it.

**Every script or iframe the SDK adds is reported as managed** (`k: "s"`, with `id`, `src`,
`category` and `via`). The elements carry no marker, so the Scanner only knows they are managed
from these entries. Today they come from `registerScript` (which `<GatedScript>` uses),
`<GatedFrame>`, and `devTrackScript` at each of the seven script-creation sites in
`@cookieyes/scripts`. A new injection point that skips this shows up in the Scanner as an
unmanaged vendor. `blockIframes` iframes need no entry: they keep `data-cy-src`.

**Report on registration, not injection.** A script waiting for consent is still managed, and
the Scanner must not need to see it load to know that.

**The consent-save entry is pushed before the save's side effects.** The Scanner times each
category's grant from the `k: "c"` entry, because runtime listeners hear about a save only after
its scripts are injected. Timing the grant from a listener made every managed script look like it
loaded a millisecond before consent. Moving the push after `applyScripts` would bring that back.
`resetConsent` pushes no save entry, so the Scanner uses each save entry once and times a change
without a fresh one from the listener; reusing the last save's time once made a withdrawal look
as if it happened at the moment of the earlier grant.

**Cookies are re-read at every consent change, before the change is recorded.** Polling alone
notices a cookie up to 2 seconds late, so one set just before Accept looked as if it was set
after. Anything found at that moment is dated just before the change, but only if the Scanner
has never seen it: back-dating a known cookie would rewrite when it actually appeared.

**A `<CookieYesProvider>` reports its decision** (`k: "p"`). In Next.js the regulation is resolved
per request there, while the runtime singleton keeps its startup value, so a panel mounted
outside the provider read GDPR while the banner showed CCPA. The panel prefers this entry.

**The queue shape is versioned.** `v: 1` marks the entry shape. Adding a new `k` is compatible,
since older panels ignore kinds they don't know. Changing an existing entry's shape needs a new
`v`, and the panel warns when it sees one it doesn't recognise.
