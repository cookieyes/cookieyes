# How script blocking works, and what it costs

If you are deciding whether to turn on `networkBlocker`, this is the page to read. It explains what
the SDK actually does to stop third-party code running before consent, what it deliberately does
*not* do, and what each mechanism costs — measured, not asserted.

## There are two mechanisms, and the important one is not "blocking"

### 1. Consent-gated injection — the primary mechanism, always on

Scripts you register with the SDK are **never added to the page until their category is granted**.
There is nothing to block, because nothing was ever loaded.

```tsx
<GatedScript id="ga" src="https://www.googletagmanager.com/gtag/js?id=G-XXX" category="analytics" />
```

On accept, `applyScripts` walks the registry and appends a `<script>` for each granted category.
Before that, the tag does not exist in the DOM and no request is made.

**Cost: effectively zero.** It is a conditional and a `Map` lookup. Nothing is patched, nothing is
intercepted, and there is no per-request overhead for the rest of the page's life.

**This is the mechanism to prefer.** If you can register a tag with the SDK, do that instead of
reaching for the network blocker.

### 2. Network interception — opt-in, for code you do not control

Some third-party code cannot be registered: a tag hard-coded into your HTML, one injected by another
vendor's script, or a beacon fired by a library you do not own. For that, `networkBlocker` patches
three browser APIs and denies matching requests until consent:

| Patched | Blocked how |
|---|---|
| `window.fetch` | returns a rejected promise |
| `XMLHttpRequest.prototype.open` / `.send` | `send` returns without dispatching |
| `navigator.sendBeacon` | returns `true` without sending (GA4 and Meta use this for exit/unload beacons) |

```ts
initCookieYes({
  mode: "cookie-only",
  networkBlocker: {
    rules: [
      { id: "ga", domain: "google-analytics.com", category: "analytics" },
      { id: "meta", domain: "facebook.net", pathIncludes: "/tr", category: "advertisement" },
    ],
  },
});
```

A request is blocked when its URL matches a rule's `domain` (and `pathIncludes`/`methods`, if given)
and that rule's category is **not** in committed consent. Once consent is granted, the patch stays
installed but stops matching, so requests flow normally.

## What it does not do

Being explicit, because the gaps matter more than the coverage:

- **It does not stop a `<script src="…">` element.** Patching `fetch`/XHR has no effect on a script
  tag — the browser fetches those through a different path entirely. There is no MutationObserver
  scanning the DOM for new script tags, and no service worker intercepting requests. If you need a
  script gated, register it (mechanism 1); the network blocker will not save you.
- **It does not unload anything already loaded.** Revoking consent stops *future* requests. A tag
  that already ran has already run — that is what the reload notice is for.
- **It is not a security boundary.** Any script on the page can capture the original `fetch` before
  the SDK initialises, or simply use an API that is not patched. It stops well-behaved third-party
  code from phoning home before consent; it does not defend against hostile code.
- **It only knows about rules you write.** There is no built-in list of tracker domains.

## What it costs

Measured in Chromium on an emulated Pixel 5, CPU throttled 4×, network throttled to ~1.6 Mbps /
150 ms RTT. Three runs.

| | Measured |
|---|---|
| Consent-gated injection (mechanism 1) | no measurable overhead — one conditional per registered script |
| `fetch()` dispatch, blocker **off** | ~29.7 µs/call |
| `fetch()` dispatch, blocker **on** | ~30.7–34 µs/call |
| **Per-request overhead of the patch** | **~1–4.5 µs** |

Method: time the *synchronous* dispatch of 2,000 `fetch()` calls without awaiting them, with and
without the blocker installed. Awaiting the responses buries the wrapper under milliseconds of
network I/O — a first attempt at this measured the overhead as *negative*, which is what
network noise looks like.

**Read this as an order of magnitude, not a precise figure.** A few microseconds per request means a
page making 100 requests pays well under a millisecond in total. The cost is not the wrapper; it is
that `fetch`, XHR and `sendBeacon` are globally patched for the page's lifetime, which is a
correctness and debuggability consideration rather than a performance one.

### Related consent timings, same conditions

| Metric | Measured |
|---|---|
| Accept clicked → gated tag's request starts | **~4–5 ms** |
| Accept clicked → banner visibly responds | ~10–13 ms |
| Customise clicked → preferences dialog focusable | **~17–20 ms** |

The first number is the one advertisers care about, and it is worth being precise about what it
excludes: the time until a tag has actually *executed* depends on the third party's CDN and the
visitor's connection, neither of which this SDK controls. In the same runs that measured ~4–5 ms to
request-start, execution completed at ~170 ms — almost all of it the tag's own round trip. Quote the
SDK-attributable number and report the rest as context.

The preferences dialog mounts on open (`if (!open) return null`), so ~17–20 ms is a real component
mount — accordions, toggles and per-category text — not a visibility toggle.

## Choosing

| Situation | Use |
|---|---|
| A tag you can reference in code | **`GatedScript` / `registerScript`** — free, and genuinely never loads |
| A tag hard-coded in HTML you control | Move it to `GatedScript` if you can; otherwise `networkBlocker` |
| A beacon fired by third-party code you do not control | `networkBlocker` |
| You want defence against hostile scripts | Neither — this is not a security boundary |

Reaching for `networkBlocker` when mechanism 1 would do means paying a global patch, and 2 KB of
bundle, for something a conditional already handles.

## Reproducing these numbers

They come from an internal benchmark harness that is **not in this repository** — it needs a real
browser, and browser tests are not part of this repo's CI. The measurements above were taken with it
and are recorded here so the numbers are quotable without re-deriving them.

If you need to re-measure: drive a server-rendered page in Chromium with CDP throttling, and time
(a) capture-phase click → `PerformanceResourceTiming.startTime` for the gated tag, (b) click →
`.cy-dialog` containing a focusable control, and (c) synchronous `fetch()` dispatch with and without
the blocker. Anything that awaits the network instead of timing dispatch will not resolve a
microsecond-scale wrapper.
