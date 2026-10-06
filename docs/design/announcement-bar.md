# The announcement strip on the docs site

The strip at the top of every page of `apps/web` (`components/AnnouncementBar.tsx`). Publishing
one is described in `apps/web/ANNOUNCEMENTS.md`; this note is for whoever changes the code.

## What it guarantees

**Nothing moves when it appears.** Whether the strip shows is decided by an inline script in
`<head>` (`lib/announcement-gate.mjs`), before the body is parsed, so a strip that should not show
never paints. The pages are prerendered, so the server cannot decide per visitor, and deciding in
React would show the strip and then pull it away. Keep the decision in that script.

**Dismissal is remembered per announcement.** The key is `cy-banner:<id>` in `localStorage`, never
a global flag: a new id shows to everyone, and a wording fix under the same id does not
interrupt people again. Changing the key format shows the current announcement to everyone who
dismissed it.

**The consent banner comes first.** In builds that load the CookieYes banner, the strip waits
until the `cookieyes-consent` cookie records a choice (`action:yes`), and appears from the next
page load. It never appears while the visitor is answering the consent banner. If the site's
consent banner changes, update the cookie check and its test.

**It works without storage.** Every storage access is in its own `try`. With storage blocked the
strip still shows, still waits for consent, and can be dismissed for the visit.

**Sticky headers sit below it.** `--cy-ann-h` is the strip's measured height; `--cy-ann-offset`
is where sticky headers and in-page links start (the height on wide screens, 0 on phones, where
the strip scrolls away); Fumadocs reads it as `--fd-banner-height`. A new sticky header must use
`--cy-ann-offset`, or it slides under the strip.

## How it has broken

- The design animated the collapse from a 200px `max-height`. Most of the 180ms was spent on space
  the strip did not fill, so while the strip stood still the nav slid up underneath it. The
  strip now has no `max-height` until dismissed, and collapses from its measured height on the
  same curve as `--cy-ann-h`.
- Character limits alone did not keep phone text to two lines: one long word pushed a 52-character
  message to three. The build now simulates the wrap at a 320px phone, with deliberately wide
  characters.

## Checks

`src/lib/__tests__/announcement-gate.test.mjs` runs the shipped script against a fake page:
dismiss one announcement, publish another, and the second shows; plus expiry, consent, the linked
page and blocked storage. The build rejects an invalid `content/announcement.json`
(`lib/announcement.ts`).
