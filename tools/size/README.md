# Bundle size: how we measure it

Every size figure this project publishes — in CI, in a changeset, on the docs
site — comes from `measure.mjs`. There is deliberately no second way to produce
one, because two methods that disagree are worse than one method that is merely
imperfect. That is not hypothetical: the figure on the landing page and the
figure on the benchmark's leaderboard were produced by different unwritten
methods, and neither matched the SDK as it stands today.

```
node tools/size/measure.mjs            # measure, print, write size-report.json
node tools/size/measure.mjs --check    # also enforce budgets.json (CI runs this)
node tools/size/breakdown.mjs          # per-module map of where the weight is
```

`measure.mjs` needs `pnpm build --filter './sdk/*'` to have run first: it packs
the SDK from `dist/`, and packing a stale `dist/` would measure the wrong code.
It fails loudly rather than measuring nothing.

## What the number means

**The delta in compressed client JavaScript between an empty Next.js app and
the same app with one CookieYes entry point mounted.**

Four fixture apps live in `fixtures/`. They are byte-identical apart from the
one component that mounts the SDK:

| fixture | key | what it mounts |
|---|---|---|
| `baseline` | `baseline` | nothing — the control |
| `with-core` | `core` | `getOrCreateConsentRuntime()`, no UI |
| `with-react-banner` | `banner` | `<CookieBanner />` alone |
| `with-react` | `interface` | `<CookieBanner />` + `<CookiePreferences />` + `<RecallButton />` |

`baseline`, `with-core` and `with-react` mirror consentbench's own `baseline`,
`with-cookieyes-core` and `with-cookieyes-react` apps, so our figures are
directly comparable to the published leaderboard. `with-react-banner` has no
counterpart there; it exists because the landing page quotes a figure for "the
whole banner", which is a narrower claim than the full interface fixture
measures.

### An opt-in fixture

`with-react-all` mounts every preset at once. It is **not** in the default app
list, because the default list is what CI budgets, and it exists only to price
the opt-out dialog and the reload notice — which no other fixture mounts, so
their cost would otherwise be invisible. Measure it explicitly:

```
node tools/size/measure.mjs \
  --apps "baseline=baseline,banner=with-react-banner,interface=with-react,all=with-react-all"
```

### Competitor comparisons are run ad hoc, not committed

Competitor fixtures are **not** kept in the repo: a competitor's package in our
dependency surface ties our build to a third party's availability and licensing,
and such a fixture generally needs their public API key checked in. Neither
belongs here for a number we take occasionally.

Be careful what such a number means. Several consent SDKs ship an npm package
that is only a *loader* — it injects a script tag and downloads the real SDK
from their CDN at runtime — so a bundle-delta measurement sees the loader and
nothing else, while ours puts everything in the build output and fetches
nothing. Compared that way the loader always wins, and the comparison is only
honest if it says so.

To re-run one, copy `with-react` to a scratch directory outside the repo, swap
the dependency and the mounted component, and point `--fixtures` at it. Nothing
in the harness needs to change.

The fixed cost of the framework cancels in the subtraction. That is the whole
reason the figure is a delta and not an absolute, and it is also why incidental
routes are harmless — they are present identically on both sides.

### Two numbers, and why both

- **initial** — the scripts the prerendered HTML for `/` actually references
  (`<script src>` plus React's module preloads, which the browser fetches just
  as eagerly). This is what a first-time visitor downloads before anything is
  interactive. **It is the headline figure.**
- **total** — `initial` plus every emitted chunk that no prerendered page
  references, i.e. the ones only reachable through a runtime `import()`.

`total` exists so that code-splitting cannot flatter the headline by moving
bytes rather than removing them. A genuine deletion shows up as both falling. A
split shows up as `initial` falling while `total` stays flat — which is a real
improvement to first paint, but it is not a smaller package, and the two should
never be reported as if they were the same thing.

Chunks belonging solely to another route are excluded from `total`. That
exclusion is load-bearing, not tidiness: Next always generates `/_not-found`,
and in the control app its chunk happens to be shared with `/` while in an
SDK-mounted app it is not. Counting it showed a phantom 3.66 KB of "dynamic"
code in `@cookieyes/core`, which ships no dynamic import at all.

### Compression

**gzip level 9 is the headline basis.** That is what consentbench publishes and
what every competitor figure we quote is stated on, so it is the only basis on
which a comparison is honest.

Brotli quality 11 is reported alongside it, because brotli is what a CDN
actually serves — it is the number a reader gets if they check in devtools, and
it runs about 12–15% below gzip on this code.

Per-file compressed sizes are summed; the concatenation is never compressed as
one blob. Chunks arrive as separate HTTP responses, so a shared dictionary
across files is not something the browser ever gets, and compressing them
together would quietly under-report.

Neither figure is "transfer size", which reads ~0 on localhost. That is exactly
why the published numbers had to be measured by hand in the first place, and why
they then drifted.

### Installed the way a customer installs it

The fixtures install the SDK from **packed tarballs**, via
`matrix/scripts/pack-tarballs.mjs` — the same helper the peer-dependency matrix
uses, for the same reason.

This is not a detail. The first version of this harness resolved the SDK through
the pnpm workspace (`workspace:*`) and measured the interface layer **1.18 KB
smaller** than a real install of the identical published artifact: byte-identical
`dist/index.js`, same Next, same React, different answer. A workspace link
satisfies `@cookieyes/react`'s React peer dependency from
`sdk/react/node_modules`, which holds its own devDependency copy of React, so
the bundler saw a module graph no consumer will ever have. `measure.mjs` now
asserts that only one copy of React resolved, and fails if not.

The fixtures are therefore **outside** the pnpm workspace. Do not add them to
`pnpm-workspace.yaml`.

### Held constant

- Next **16.3.0**, React **19.2.8**, pinned exactly in every fixture.
- `next.config.ts` is empty in every fixture. No build tuning a real consumer
  would not have.
- `NEXT_TELEMETRY_DISABLED=1`, `NODE_ENV=production`.

The measurement is deterministic: repeated runs on one machine produce
byte-identical figures. Across machines, expect the *delta* to be stable even
where the control's absolute size is not.

**A version bump alone moves the figure by a few bytes.** The fixtures install
from packed tarballs, so the resolved path contains the version
(`.pnpm/@cookieyes+react@file+…+cookieyes-react-0.6.1.tgz`), and Turbopack folds
module paths into its module identifiers. Publishing 0.6.0 → 0.6.1 with no code
change at all moved the interface layer by 4 bytes and the Next.js adapter by
−2, while core — whose version did not change — moved by 0. It is 0.03% and it
is not a code change, but it is why the budgets carry headroom rather than
sitting on the measured value, and why a diff of ±a few bytes after a release
needs no investigation.

This is also why the docs site's staleness check compares a **fingerprint of the
SDK's bundle inputs** (`sdk-fingerprint.mjs`) and not package versions. A
version comparison is wrong in both directions: it fails the changesets release
PR, which bumps versions and touches no code, and it passes an ordinary pull
request that changes code without touching a version. The first of those blocked
a release before it was fixed.

### What is not in the JS delta

The stylesheet. `@cookieyes/react/styles.css` and `critical.css` are measured
and reported separately, because a real consumer does ship them and leaving
them unmeasured is a gap someone eventually fills with a guess. They are not
added into the JS figure, and a JS figure must never be quoted as though it
included them.

## `breakdown.mjs` — where the weight is

`measure.mjs` answers "how big is it". `breakdown.mjs` answers "what is it made
of", per module, so work goes at the biggest things rather than the most obvious
ones.

- **own** — bytes Rollup rendered for that module, **before minification**.
  Exact, and they sum to the unminified bundle total, so the column is
  auditable: the report prints the residual, and if it does not add up the
  breakdown is wrong. Pre-minification because that is the last point at which
  per-module boundaries still exist — terser rewrites across them — so read
  `own` as a proportional map, not a shipped byte count.
- **pullIn** — the compressed size of a bundle whose only entry is that module:
  what it costs *including everything it drags in*. This is the number that
  matters when deciding whether a subsystem can be made optional. A 300-byte
  module that reaches half the engine saves you 300 bytes, not half the engine.

There is deliberately no per-module gzip column. Gzip is not additive — a
module's compressed contribution depends on what surrounds it — so such a column
could only be an apportionment, which is a guess wearing a decimal point.

**The saving from an actual change is never taken from `breakdown.mjs`.** It
comes from `measure.mjs`, which builds real apps. The breakdown says where to
look; only the app measurement says what a change was worth. Splitting a module
that a bundler was already eliminating is the standard way to produce a change
that looks right and does nothing. Two measured examples from this repo: a
dynamic `import()` whose module is also barrel-exported gets flattened back
into the main chunk and emits no second chunk at all, and splitting a component
a bundler already drops when unmounted saves nothing.

## Budgets

`budgets.json` holds ceilings enforced by `--check`, plus the targets we are
aiming at and the history that justifies having budgets at all.

Budgets are **ceilings, not targets**, set just above the current measured value
so unnoticed creep fails a build. Core and the interface have separate budgets
so growth in one is not hidden by the other. `--check` also prints the change
against the previous published release, so slow creep is visible as a trend
rather than only as a threshold breach.

Raising a budget is a deliberate decision that belongs in the same change as the
growth, with a reason. It is not a fix for a red build.

`targets` are recorded but **not enforced**. A target that fails every build is
noise, not a signal.

## Updating the published figures

`size-report.json` is the committed artifact and the single source for any size
claim. When a release changes it:

1. Re-run `node tools/size/measure.mjs` and commit the report.
2. Move `previous` in `budgets.json` to the newly published version's numbers.
3. Anything that quotes a figure reads it from the report — nothing is typed by
   hand in a second place.

You do **not** have to do this to unblock a release. The changesets release PR
changes only versions and CHANGELOGs, which the fingerprint ignores, so it
passes on its own. Refreshing the report keeps `previous` meaningful; it is not
a gate.
