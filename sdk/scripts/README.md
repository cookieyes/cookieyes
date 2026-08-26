# @cookieyes/scripts

Ready-made, consent-gated third-party integrations for [CookieYes](https://github.com/cookieyes/cookieyes).

Nothing loads until the visitor grants the matching consent category. When they
withdraw it, the script is removed or silenced — **no page reload**, nothing the
visitor was doing is lost.

```ts
import { initCookieYes } from "@cookieyes/react"; // or "@cookieyes/core"
import { segment } from "@cookieyes/scripts";

initCookieYes({
  mode: "cookie-only",
  integrations: [segment({ writeKey: "YOUR_WRITE_KEY" })],
});
```

Segment now loads only after the visitor grants `analytics`, and is fully
removed if they later withdraw it.

## Install

```bash
npm install @cookieyes/scripts
```

It works with either `@cookieyes/core` or `@cookieyes/react` — you pass the
presets to the `integrations` option of the same `initCookieYes(config)` you
already use.

## What's in the box

| Export | What it's for |
|---|---|
| `segment(config)` | Segment (`analytics.js`), gated behind consent. |
| `metaPixel(config)` | Meta Pixel (`fbq`), gated behind consent. |
| `ga4()` / `googleAds()` / `googleTagManager()` | Google via Consent Mode (GA4, Ads, GTM). |
| `posthog(config)` / `posthogSync(config)` | PostHog (`posthog-js`) — we load it, or sync consent with yours. |
| `customScript(config)` | Gate any third-party `<script>` that has no dedicated preset. |
| `createQueue()` / `flushQueue()` | The queue/stub pattern most tracking scripts use, so early calls aren't lost. |

## How an integration behaves

Every integration is described by two plain choices:

- **`load`** — when it starts: `"afterConsent"` (only once its category is
  granted) or `"immediately"`.
- **`onRevoke`** — what happens when consent is withdrawn:

| `onRevoke` | On withdrawal | Use for |
|---|---|---|
| `"remove"` | Script removed, identifiers cleared. Re-loads on re-grant. | Trackers that must fully stop (Segment). |
| `"silence"` | Script stays, told to go quiet; resumes on re-grant. | Vendors with a quiet/resume API (Meta `fbq`). |
| `"keep"` | Nothing — the vendor manages its own consent signal. | Google Consent Mode. |

**The presets set these for you.** The correct mode is *vendor knowledge* — it
depends on how each vendor behaves, not on your app — so `segment()` locks it in
and you can't pick the wrong one. Only `customScript` lets you choose, because
only you know how your own script behaves.

### Custom categories

Every preset accepts a `category` to match your taxonomy. If you use a **custom
`categories` list** (not the built-in five), pass the matching id — e.g.
`segment({ writeKey, category: "stats" })`. A preset left on a default category
that doesn't exist in your taxonomy would wait for consent that never comes and
silently never load — so the SDK **warns** when it detects this.

## Presets

### `segment(config)`

```ts
segment({
  writeKey: "YOUR_WRITE_KEY", // required — public by design, safe in browser code
  category: "analytics",      // optional — the category that gates it (default "analytics")
  id: "segment",              // optional — only needed if you run more than one
});
```

- **`onRevoke: "remove"`** — on withdrawal the script and Segment's own
  identifiers (`ajs_anonymous_id`, `ajs_user_id`) are removed. Withdrawal really
  means "stop and wipe."
- Send events through `window.analytics` (`analytics.track(...)`,
  `analytics.identify(...)`); the snippet queues calls until the library loads.
  **But because `remove` deletes `window.analytics` on withdrawal, a later
  `analytics.track(...)` throws.** Use `safeCall` to call from anywhere without
  guarding — it's a no-op when Segment is gone (i.e. no consent), so it never
  throws and never tracks without consent:

  ```ts
  import { safeCall } from "@cookieyes/scripts";
  safeCall("analytics", "track", "Signup", { plan: "pro" });
  ```
- **Expected:** each re-grant starts a fresh Segment session, so Segment sends a
  new page view. That's normal Segment behaviour, not a double-count of your own
  tracked events.
- **Attach the consent choice to the profile** (if you want it in Segment): do it
  yourself on a consent change — `getCookieYes().manager.subscribe(...)` then
  `analytics.identify(id, { consent: {...} })`. We don't do it for you, so you
  control the traits and timing.
- **Account setting:** turn Segment's own consent/Consent-Management features
  **off** — this preset is the gate. Two consent layers fighting each other is the
  usual cause of "events don't show up."
- **Server-side boundary:** this is a browser package. It stops *client* tracking
  and clears client ids. It **cannot** delete data already sent to Segment —
  that's Segment's server-side deletion/suppression API (a secret key, your
  backend), out of scope here.

### `metaPixel(config)`

```ts
metaPixel({
  pixelId: "123456789",       // required — your Meta Pixel ID
  category: "advertisement",  // optional — the category that gates it (default "advertisement")
  id: "meta",                 // optional — only needed if you run more than one
  autoPageView: true,         // optional — send the first-page PageView (default true; false for SPAs)
  limitedDataUse: undefined,  // optional — omit to auto-enable for US opt-out (CCPA); true/false forces it
});
```

- **`onRevoke: "silence"`** — on withdrawal we call Meta's own
  `fbq('consent', 'revoke')` rather than removing the script, and clear Meta's
  `_fbp` / `_fbc` cookies (Meta's own revoke leaves them). A re-grant calls
  `fbq('consent', 'grant')`, so tracking resumes without re-downloading
  `fbevents.js`.
- Track events with `fbq(...)` as usual. Calls made after a revoke are held by
  Meta's consent mechanism and delivered if consent is re-granted — not dropped.
  To call before it has loaded, guard it: `window.fbq?.("track", "Purchase")`.
- **`autoPageView: false`** — turn off the automatic first-page `PageView` and
  send page views yourself (single-page apps).
- **`limitedDataUse`** — Meta's US privacy flag. Omit it and it's enabled
  automatically for a US opt-out (CCPA) visitor via the detected region; pass
  `true`/`false` to force it. It's sent before `init`, as Meta requires.
- **Server-side boundary:** browser-side event **deduplication with the
  Conversions API** (a shared `event_id` between the pixel and your server) needs
  a server sending matching events — out of scope for this browser package.

### Google — `ga4()`, `googleAds()`, `googleTagManager()`

Google works through **Consent Mode**, which is different from a gated script.
Every Google tag shares one `dataLayer`, and consent must **deny by default
before any tag runs and before `initCookieYes`** — then the SDK broadcasts the
visitor's real choice on top. That default belongs in the page `<head>`:

```tsx
// Next.js — app/layout.tsx
import { GoogleConsentMode } from "@cookieyes/nextjs/server";
<body><GoogleConsentMode />{children}</body>
```

For a non-Next app, paste the snippet in `<head>`, or call the runtime form
before `initCookieYes`:

```ts
import { googleConsentModeSnippet, bootstrapGoogleConsentMode } from "@cookieyes/scripts";

// (a) inline in <head>:  <script>${googleConsentModeSnippet()}</script>
// (b) or, before initCookieYes:
bootstrapGoogleConsentMode();
```

> **Why before init:** the SDK broadcasts the consent *update* once at startup.
> If the `dataLayer` and its deny-default aren't set yet, a returning visitor who
> consented last time would be stuck denied until they act again. The head
> snippet is what prevents that. If you skip it, the preset falls back to a
> deny-default and warns.

Then load the tags on the client — they're `load: "immediately"`,
`onRevoke: "keep"` (Consent Mode governs the gating, and the SDK broadcasts every
change):

```ts
import { ga4, googleAds, googleTagManager } from "@cookieyes/scripts";

initCookieYes({
  mode: "cookie-only",
  integrations: [
    ga4({ measurementId: "G-XXXXXXX" }),   // GA4
    googleAds({ conversionId: "AW-XXXXXXX" }), // Google Ads
    // or, if you manage tags through a container instead:
    // googleTagManager({ containerId: "GTM-XXXXXXX" }),
  ],
});
```

- **GA4 and Ads share one `gtag.js`** — loaded once, configured per product, so
  running both doesn't load the library twice.
- **GTM** loads the container; the tags inside it (GA4, Ads, …) are governed by
  the same Consent Mode signals — so use `googleTagManager()` *instead of*
  `ga4()`/`googleAds()` when those products live in your container.
- Each takes an optional `category` and `id` override.
- **`params`** on `ga4()`/`googleAds()` passes extra `gtag('config', …)` options —
  e.g. `ga4({ measurementId, params: { send_page_view: false } })` for a single-page
  app, or `{ debug_mode: true }` for DebugView.
- **`consentMode: "basic"`** loads the tag **only after** consent and **removes it
  on withdrawal** — so no tag and no cookieless pings whenever consent isn't given.
  Default `"advanced"` loads immediately and lets Google send cookieless pings
  while denied. (Basic removes the shared `gtag.js`, so use it for a single Google
  product per page; for several, prefer `"advanced"`.)
- **`restrictedDataProcessing`** on `googleAds()` — Google's US/California flag,
  the Ads counterpart of Meta's LDU. Omit it and it's on automatically for a US
  opt-out (CCPA) visitor; `true`/`false` forces it.
- **`urlPassthrough` / `adsDataRedaction`** on the Consent Mode options
  (`googleConsentModeSnippet` / `bootstrapGoogleConsentMode`) turn on Google's
  recommended ad-performance behaviour while `ad_storage` is denied. Off by default.
- **Don't run the same product twice:** if you load GA4/Ads *inside* your GTM
  container, use `googleTagManager()` alone — not also `ga4()`/`googleAds()` for
  the same id. The SDK **warns** if it sees a container and a standalone tag together.
- If a **custom taxonomy** maps more than one category to the same Google signal,
  set `googleConsentMatch: "all"` on `initCookieYes` to grant the signal only when
  *all* of them are granted (default is `"any"` — grant if any one is).
- **Server-side boundary:** a GTM **server container** or the Google Ads API run on
  your backend — out of scope for this browser package.

### `posthog(config)` / `posthogSync(config)`

PostHog makes you decide one thing up front, because it's a legal choice, not a
technical one: **what does rejecting consent mean?**

- **`onReject: "stop"`** — nothing loads until consent; on withdrawal PostHog and
  its data are removed. Reject means **no tracking at all**.
- **`onReject: "anonymous"`** — PostHog keeps **counting visits with no cookie** (a
  privacy-preserving server-side hash), and upgrades to normal cookie-based
  tracking only on Accept. Reject means **keep counting, without a cookie**.

`onReject` is **required** — there is no default. (A plain-JS caller who omits it
gets a console warning and falls back to the safe `"stop"`.)

**Which setup style?**

- **`posthog()`** — we load PostHog for you, from your project API key.
- **`posthogSync()`** — you already load and `init` PostHog yourself; we only keep
  consent in sync (`opt_in` / `opt_out`) and inject nothing. Initialise PostHog
  *before* `initCookieYes` runs, and choose the mode there (set
  `cookieless_mode: "on_reject"` in your own `init` for the anonymous behaviour).

```ts
// (a) we load it for you:
import { posthog } from "@cookieyes/scripts";
initCookieYes({
  mode: "cookie-only",
  integrations: [
    posthog({
      apiKey: "phc_XXXXXXXX",  // required — public by design, safe in browser code
      onReject: "stop",        // required — "stop" or "anonymous"
      region: "us",            // optional — "us" (default) or "eu"; sets api_host
      // apiHost: "https://ph.example.com", // optional — self-hosted; overrides region
      category: "analytics",   // optional — the category that gates it (default "analytics")
    }),
  ],
});

// (b) you already load PostHog yourself:
import { posthogSync } from "@cookieyes/scripts";
initCookieYes({ mode: "cookie-only", integrations: [posthogSync()] });
```

- **Anonymous loads on page load, before the banner is answered.** To count
  cookie-free it must run right away — so a request carrying the visitor's IP
  reaches PostHog *before* any choice is made. **No cookie is ever set until
  Accept.** If that pre-consent request isn't acceptable for you, use `"stop"`.
- **Account setting (anonymous only, required):** turn on **Cookieless** in your
  PostHog project — *Settings → Web analytics → "Enable cookieless tracking"*. It
  lives in your own PostHog account, not in this code (same as Segment's own
  consent setting), and **anonymous mode does nothing without it**.
- **`region` / `apiHost`** — one value keeps everything aligned: `region: "eu"`
  sends data to the EU (`eu.i.posthog.com`); `apiHost` overrides it for a
  self-hosted or reverse-proxied PostHog.
- **Send events** with `posthog.capture(...)` as usual. In `"stop"` mode
  `window.posthog` isn't there before the first grant, so guard it —
  `safeCall("posthog", "capture", "Signup")` is a no-op until it loads and never
  throws.
- **Check consent with *our* record, never PostHog's.** PostHog's own "has this
  visitor decided?" check has a known bug that can report *yes* when nobody has —
  which has made real banners never show. Read consent from the SDK, not from
  `posthog.has_opted_in_capturing()`.
- **Honest limits:**
  - A consent change can make PostHog **count one visit as two** — it starts a new
    session when it switches cookie modes. This is a known PostHog behaviour, not a
    fault in the gating.
  - Cookie-free tracking is **not full compliance on its own** — you still need a
    lawful basis, clear wording, data-minimisation, IP handling, and a real
    deletion process.
- **Verify your reject choice** — the one thing worth checking directly. Reject in
  the banner and watch the Network tab + `document.cookie`:
  - `"stop"` → **no** requests to `*.posthog.com`, no `ph_` cookie.
  - `"anonymous"` → requests to `*.posthog.com` **continue**, but still **no `ph_`
    cookie** (`posthog.get_distinct_id()` is `"$posthog_cookieless"`).

### `customScript(config)`

Gate any one-off third-party script behind consent.

```ts
customScript({
  id: "widget",                        // unique id (used for de-dup + the debug view)
  src: "https://example.com/w.js",     // script URL, loaded once consent is granted
  category: "functional",              // the category that gates it (or an array — see below)
  onRevoke: "remove",                  // "remove" (default) or "keep"
  attrs: { "data-id": "abc" },         // optional extra <script> attributes (e.g. nonce)
  stub: { global: "myTag", methods: ["track"] }, // optional queue stub (see below)
});
```

- The script always loads **after** its category is granted. Loading before
  consent isn't offered here on purpose — a gated script that loads immediately
  would run with no consent. If you genuinely need immediate load, write a
  [raw integration](#writing-your-own-integration).
- `onRevoke: "remove"` (default) takes the script off the page on withdrawal;
  `"keep"` leaves it. Only choose `"keep"` if the script manages its own consent.
- `category` can be an **array** to require more than one — e.g.
  `category: ["functional", "analytics"]`. Combine with `match: "all"` (default,
  needs every one) or `match: "any"` (needs at least one).
- `attrs` are set on the `<script>` before it's added — so `nonce` works for a
  strict CSP.

## Queue helpers — `createQueue` / `flushQueue`

Most tracking scripts install a placeholder that **queues** calls made before
the real library has loaded, then replays them once it arrives — so nothing is
lost, and a queued call can never fail. These helpers give your own integration
the same behaviour without hand-rolling it.

```ts
import { createQueue, flushQueue } from "@cookieyes/scripts";

// Create the global stub once (returns the existing one if already present):
const analytics = createQueue("analytics", ["track", "identify", "page"]);
analytics.track("Signup"); // queued now, delivered once the real script loads

// When your real library is ready, replay the queue and route later calls to it:
flushQueue("analytics", (method, ...args) => realAnalytics[method](...args));
```

`customScript`'s `stub` option is a shortcut for `createQueue`.

## Writing your own integration

A preset just returns an `Integration` object — the same shape the engine runs.
For a vendor with no preset, and when `customScript` isn't enough (you need
`immediately` load, or `silence`), write it by hand:

```ts
import type { Integration } from "@cookieyes/core";

const myVendor: Integration = {
  id: "my-vendor",
  category: "analytics",
  version: 1,
  load: "afterConsent",
  onRevoke: "remove",
  // setup runs when the category is granted; return a cleanup for "remove".
  setup: () => {
    const el = document.createElement("script");
    el.src = "https://example.com/v.js";
    document.head.appendChild(el);
    return () => el.remove(); // the cleanup — run on withdrawal
  },
};

initCookieYes({ mode: "cookie-only", integrations: [myVendor] });
```

`setup` receives a context with `granted()`, `onConsentChange(fn)` (auto-released
on teardown), and the resolved `region`. The return type is enforced by
`onRevoke`: `remove` → a cleanup function, `silence` → `{ silence, resume }`,
`keep` → nothing.

### Choosing `load` and `onRevoke` safely

The safe defaults are `load: "afterConsent"` + `onRevoke: "remove"` — nothing
runs before consent, and everything is torn down after. The other choices are
for specific cases and are only safe when they match how the script behaves:

- **`load: "immediately"`** — runs *before* consent. Safe **only with
  `onRevoke: "keep"`** and a script that stays silent until told otherwise (Google
  Consent Mode, which denies by default). `immediately` + `remove` means "runs
  with no consent, and is only removed after a granted-then-revoked" — fine under
  an opt-out regime (CCPA), a footgun under opt-in (GDPR).
- **`onRevoke: "keep"`** — leaves the script running on withdrawal. Only safe if
  the script manages its **own** consent signal; otherwise it keeps tracking after
  the visitor said no.
- **`onRevoke: "silence"`** — the script stays loaded but is told to go quiet.
  Only possible if the vendor has a real quiet/resume API (Meta's `fbq`).

The engine also flags common mistakes with a console warning: an unknown format
`version`, a duplicate `id`, the same vendor in both `integrations` and
`builtInIntegrations`, an old `{ vendor }` entry, and a category that isn't in
your taxonomy (or an empty one).

### Sending events safely (the vendors compared)

Whether you must guard a vendor call depends on what the preset does on revoke:

| Vendor | Global | Calling it directly |
|---|---|---|
| **Segment** | `window.analytics` | **Always guard** — `remove` deletes it on revoke, so a bare `.track()` throws. Use `safeCall("analytics", "track", …)`. |
| **Meta** | `window.fbq` | Guard **before it loads** — `window.fbq?.("track", …)`. After load it persists (`silence` keeps it), and calls while denied are held by Meta. |
| **Google** | `window.gtag` | **Safe** — `gtag` pushes to the `dataLayer`, which persists, so a direct call never throws. |
| **PostHog** | `window.posthog` | Guard **before the first grant in `"stop"` mode** (`remove` — absent until consent): `safeCall("posthog", "capture", …)`. In `"anonymous"` mode it's present from load. |

### Testing your integration

A quick checklist for a custom integration or preset:

1. **Before consent** — nothing loads: no network request, no script tag, no
   cookie/identifier.
2. **On grant** — the script loads; status goes `loading` → `active`.
3. **On revoke** — `remove` takes the tag off and clears identifiers; `silence`
   goes quiet (script stays); `keep` does nothing. Status reflects it.
4. **On re-grant** — `remove` re-loads once (no duplicate tag); `silence` resumes
   without re-downloading.
5. **Multiple products / the same vendor twice** — no double-load, and the SDK
   warns on an overlap.

Drive it with real banner clicks, not just programmatic calls, so the UI wiring
is exercised too. In a browser, watch the Network tab and `document.cookie`.

### Debugging

The runtime exposes `getIntegrations()` — config + live status for each
integration — as the data for a debug view:

```ts
import { getCookieYes } from "@cookieyes/react"; // or the runtime initCookieYes returns

console.table(getCookieYes().getIntegrations());
// [{ id: "segment", category: "analytics", load: "afterConsent", onRevoke: "remove", status: "active" }, …]
```

## Good to know

- **Removing a loaded script can't un-run it.** On revoke we remove the tag and
  clear identifiers, but code already executed stays in memory until the next
  page load — where the script never loads again without consent. That's the
  real, full block; the client-side removal is the best-effort in-between.
- **Don't configure the same vendor twice** — a preset in `integrations` and the
  same vendor in the deprecated `builtInIntegrations` would load it twice. The
  SDK warns if it sees this.

## License

MIT © [CookieYes](https://www.cookieyes.com)
