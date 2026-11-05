# Vendor behaviour the integrations rely on

Four integrations in `@cookieyes/scripts` depend on how the vendor's script behaves today, not
only on a documented API. If the vendor changes that behaviour, the
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

## Matomo (`sdk/scripts/src/matomo.ts`)

The consent commands themselves (`requireConsent`, `setConsentGiven`, `requireCookieConsent`,
`setCookieConsentGiven`, `forgetCookieConsentGiven`, `deleteCookies`) are documented in Matomo's
"Tracking & Cookie Consent" guide. Two details are not.

**What we rely on.** While consent is withdrawn (`requireConsent`), `matomo.js` keeps every
tracking request in an in-memory queue and `setConsentGiven` sends them all. `trackPageView`
empties that queue before queuing its own request, so the re-grant pushes `trackPageView` first
and only the fresh page view goes out. Also, the tracker reads its own consent cookies
(`mtm_consent`, `mtm_consent_removed`, `mtm_cookie_consent`) before every request and they win
over the pushed commands, so the integration deletes them before the tracker loads.

**Last checked:** November 2026, in `matomo.js` (Matomo 5) and live on a Matomo Cloud site: an
event pushed while withdrawn was sent on a plain `setConsentGiven`, and not sent when
`trackPageView` came first. `requireConsent` plus `deleteCookies` removed `_pk_id` and `_pk_ses`
and set no `mtm_*` cookie.

**How to re-check.** On a page with the tracker loaded and consent given, push `requireConsent`
and `deleteCookies`, then `trackEvent`, then `trackPageView` and `setConsentGiven`. Only one
request, the page view, may reach `matomo.php`. If the event is sent too, Matomo stopped clearing
the queue in `trackPageView`; if the event is not sent even without the `trackPageView`, Matomo
stopped queuing and the extra push can go.

## Microsoft Advertising UET (`sdk/scripts/src/microsoft-uet.ts`)

The consent signal (`consent default` / `consent update` with `ad_storage`) and the `_uetmsdns`
"do not send" cookie are documented by Microsoft. How the tag reads that cookie is not.

**What we rely on.** `bat.js` reads `_uetmsdns` once, when the tag is built, into
`uetq.uetConfig.msDns`, and every beacon path (image beacons and `sendBeacon`) checks that flag
before sending. So the cookie alone cannot stop a tag that is already running, and on withdrawal
the integration also sets the flag itself; a re-grant clears it. The tag also keeps a copy of each
`_uet*` cookie in localStorage, with a matching `_exp` key, so both are deleted. Loading `bat.js` a
second time on the same page double-counts every route change (the first copy keeps its history
hook), which is why withdrawal silences the tag instead of removing it.

**Last checked:** November 2026, in `bat.js` and live on a local page with a placeholder tag id:
`uetConfig.msDns = true` stopped the page-load, route-change, custom-event and page-hide beacons at
once; setting the cookie after the tag had started stopped nothing; a second `bat.js` sent two
page-hide beacons per route change.

**How to re-check.** On a page with the tag loaded and consent given, set
`window.uetq.uetConfig.msDns = true`, then change the route with `history.pushState` and push a
custom event. Count the entries for `bat.bing.com/action/` in
`performance.getEntriesByType("resource")`: none may be added. (Playwright's request event misses
the image beacons; the performance entries do not.) If beacons still go, the flag was renamed:
withdrawal then still pushes `update denied` and sets the cookie for the next page load.
