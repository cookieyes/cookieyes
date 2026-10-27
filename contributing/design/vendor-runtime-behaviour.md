# Vendor behaviour the integrations rely on

Two integrations in `@cookieyes/scripts` stop their vendor on withdrawal through how the vendor's
script behaves today, not through a documented API. If the vendor changes that behaviour, the
integration keeps passing its tests (they use a stub, not the vendor's script) while the real
vendor keeps tracking after the visitor said no. Re-check both against the live script before a
release that touches them, and at least every few months.

## Ahrefs Web Analytics (`sdk/scripts/src/ahrefs.ts`)

**What we rely on.** `analytics.js` reads the `data-key` attribute from its own `<script>` tag
before every event (page view, link click, form submit, `sendEvent`) and drops the event, logging
`Ignoring Event: missing data-key`, when the attribute is missing. Withdrawal removes the attribute
(`onRevoke: "silence"`); re-grant puts it back.

**Why not remove the tag.** Removing it does not stop the script: its history patch, link and form
listeners and `MutationObserver` stay installed and keep sending. The script also refuses to start
a second time while `window.AhrefsAnalytics` exists, so it cannot be removed and loaded again.

**Last checked:** October 2026, in Chromium with the live script and the event endpoint intercepted:
page view, `sendEvent` and link click all sent with the key, none without it, all again after it
was restored. No cookies and no browser storage at any point.

**How to re-check.** Load `https://analytics.ahrefs.com/analytics.js` with `data-key` on a page
served from a real hostname (it ignores `localhost` and browsers with `navigator.webdriver` unless
`window.__web_analytics` is set). Route `/api/event` to a local stub. Remove the attribute, then
call `history.pushState`, `AhrefsAnalytics.sendEvent` and click a link: no request may reach the
stub. Restore it and repeat: requests resume.

## Hotjar (`sdk/scripts/src/hotjar.ts`)

**What we rely on.** Nothing stops Hotjar at runtime. It records over a WebSocket until the page
unloads, after its cookies, storage and tags are removed, and after `hj.optOut = true`. That is why
the integration deletes what it can and offers `reloadOnRevoke`.

**What to protect.** Never delete `window.hj` on withdrawal: Hotjar's running loop then throws
`hj is not defined` several times a second until the page unloads. Never load a second copy on the
same page after a re-grant: the first copy is still running.

**Last checked:** October 2026, on a live site with recording on.

**How to re-check.** On a site with a Hotjar site ID and recording on, count WebSocket frames to
`ws.hotjar.com` after running the integration's cleanup. If they stop without errors and do not
resume, Hotjar has gained a way to stop and the integration can be simplified.
