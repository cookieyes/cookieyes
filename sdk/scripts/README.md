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
| `customScript(config)` | Gate any third-party `<script>` that has no dedicated preset. |
| `createQueue()` / `flushQueue()` | The queue/stub pattern most tracking scripts use, so early calls aren't lost. |

> A Google preset is on the way. Until then, `customScript` + `createQueue`
> cover any vendor.

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
- Send events through `window.analytics` as usual (`analytics.track(...)`,
  `analytics.identify(...)`). Segment's snippet queues calls until the real
  library has loaded, so a call made right after consent isn't lost.
- **Expected:** each re-grant starts a fresh Segment session, so Segment sends a
  new page view. That's normal Segment behaviour, not a double-count of your own
  tracked events.

### `metaPixel(config)`

```ts
metaPixel({
  pixelId: "123456789",       // required — your Meta Pixel ID
  category: "advertisement",  // optional — the category that gates it (default "advertisement")
  id: "meta",                 // optional — only needed if you run more than one
});
```

- **`onRevoke: "silence"`** — on withdrawal we call Meta's own
  `fbq('consent', 'revoke')` rather than removing the script, and clear Meta's
  `_fbp` / `_fbc` cookies (Meta's own revoke leaves them). A re-grant calls
  `fbq('consent', 'grant')`, so tracking resumes without re-downloading
  `fbevents.js`.
- Track events with `fbq(...)` as usual. Calls made after a revoke are held by
  Meta's consent mechanism and delivered if consent is re-granted — not dropped.
  (That's Meta's own behaviour, not a buffer of ours.)

### `customScript(config)`

Gate any one-off third-party script behind consent.

```ts
customScript({
  id: "widget",                        // unique id (used for de-dup + the debug view)
  src: "https://example.com/w.js",     // script URL, loaded once consent is granted
  category: "functional",              // the category that gates it
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
