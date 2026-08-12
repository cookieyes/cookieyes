# Banner first-paint: what to protect and why

This documents the guarantees the consent banner is supposed to hold at first paint, why they matter,
and — importantly — **how they have been broken before**, so the next person changing this code knows
what to be careful with.

## Why this file exists

The banner is the first thing a visitor sees, and it is the part of a page most often blamed for a
poor performance score. Two properties matter:

1. **It should be visible in the same frame as the rest of the page.** A banner that appears a
   fraction of a second later feels bolted on, and it means the page has visually "started" before
   the visitor was asked anything about tracking.
2. **It should not move anything.** A banner that pushes content around as it arrives costs real
   Cumulative Layout Shift, which search engines measure.

Both have been true, then quietly stopped being true, twice:

| Commit | What happened |
|---|---|
| `8a0a8b0` (Jun 2026) | Made the banner server-rendered so it paints with the page. Roughly halved the delay. |
| `8a9ea78` (Jul 2026) | Fixed a real CSP bug by moving the stylesheet to a static file — and, in doing so, dropped the `--cy-*` **theme token defaults**. Every `var(--cy-bg)` in the sheet then had no value, so the server-rendered banner painted **transparent and unstyled until hydration**. Undid much of `8a0a8b0`, and went unnoticed for weeks. |
| present from `8a0a8b0` | `Banner.Root` renders inline on the server, then moves into a `<body>` portal after an effect — which replaces the DOM node and re-ran the entry animation. Invisible on a fast machine; on a slow device it made an already-visible banner disappear and fade in again. |

Neither was caught by a test, for one reason: **jsdom cannot measure paint.** The unit tests could
confirm the markup existed. Nothing confirmed a visitor could actually *see* it.

## The invariants, and what guards each one

These run in the ordinary `pnpm test` job — no browser needed.

| Invariant | Guard |
|---|---|
| Every `var(--cy-*)` in the stylesheet has a declaration | `react/src/__tests__/styles-parity.test.ts` — **this is the test that would have caught `8a9ea78`** |
| The `:root` defaults match `computeThemeVars` exactly | same file |
| The entry animation mutates opacity only — no `transform`, no layout properties | `react/src/__tests__/banner-footprint.test.ts` |
| The entry animation is ≤ 0.2s | same file |
| A re-parented banner does not re-run the entry animation | same file (`data-cy-entered`) |
| The banner card is `position: fixed`, out of flow, footprint capped | same file |
| `critical.css` is byte-identical to the full sheet, ≤ 2 KB gzipped | `react/src/__tests__/critical-css.test.ts` |
| Minifying the shipped CSS changes no declaration | `react/src/__tests__/minify-css.test.ts` |
| The banner is present in server-rendered HTML | `react/src/__tests__/ssr-first-paint.test.tsx` |
| A returning visitor's HTML contains no banner | `react/src/__tests__/ssr-returning-visitor.test.tsx` |
| The consent decision is committed and broadcast before any side effect runs | `core/src/__tests__/persist-ordering.test.ts` |
| A throwing third-party tag cannot strand the banner or block mounting | same file |
| `readServerConsent` agrees with the client about the same cookie | `core/src/__tests__/server-consent.test.ts` |

## What these cannot tell you

The list above verifies that the **rules are right**. It cannot verify that **the visitor sees the
banner**, because jsdom has no paint, no layout shift, no compositor, and does not resolve CSS custom
properties. Specifically, none of it can measure:

- first contentful paint, or whether the banner was painted in that frame
- Cumulative Layout Shift
- click → visible-response latency
- the slow-device case where hydration lands after the entry animation has finished

Verifying those needs a real browser driving a genuinely server-rendered page. That verification was
done with a local Playwright harness — a fixture app that server-renders the banner, inlines
`critical.css`, and serves consent-gated stand-in tags — run under emulated mobile with CPU and
network throttling. **That harness is not in this repo.** It was kept local deliberately; a previous
browser suite was removed in `547be40`, and re-adding one is a team decision rather than a drive-by.

Measurements taken with it, for reference (Chromium, emulated Pixel 5, CPU ×4, ~1.6 Mbps / 150 ms RTT,
cold cache):

| | Before | After |
|---|---|---|
| Banner background with JavaScript disabled | `rgba(0, 0, 0, 0)` | `rgb(255, 255, 255)` |
| Banner present and laid out at FCP | no | yes (FCP ~232 ms) |
| CLS attributable to the banner | — | 0 |
| Click → visible response | — | 10–13 ms, with 0 of 6 gated tags loaded |
| Opacity drop when the node is re-parented, normal speed | 0.067 | 0.000 |
| Opacity drop when the node is re-parented, CPU ×20 | 0.731–1.000 | 0.000 |

## If you change this code

Assume you can break first paint without any test failing. The cheap checks to run by hand:

1. Server-render a page with the banner, **disable JavaScript**, and reload. The banner must be
   fully styled — white background, correct font. If it is transparent, the theme tokens have been
   lost again.
2. Throttle CPU to 20× in DevTools and reload. The banner must not visibly disappear and fade back in.
3. Accept, then reload. The banner must be absent from View Source, not flash and vanish.

And treat these as tripwires in review:

- adding a `--cy-*` token to `styles/tokens.ts` without adding it to the stylesheet's `:root` block
  (or vice versa) — the parity test catches this, so do not "fix" that test by loosening it
- adding a rule the banner needs to paint without adding it to `critical.css`
  (`pnpm --filter @cookieyes/react build:critical-css` regenerates it)
- reintroducing a `transform` in the entry animation, or lengthening it
- adding anything to `persist()` **before** `notify()` in `core/src/manager.ts`
- making a client effect responsible for something the server render needs
