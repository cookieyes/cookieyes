---
"@cookieyes/scripts": minor
---

New integration: Mixpanel, consent-gated, with Mixpanel's own opt-in and opt-out.

**What changed.** `mixpanel({ token })` loads Mixpanel after the visitor grants the analytics category: nothing is on the page before that. On withdrawal it stops Mixpanel's batching, calls `opt_out_tracking()`, which drops unsent events and deletes Mixpanel's cookie, and removes the localStorage record and queues, the tab ids and Mixpanel's IndexedDB database. The script stays on the page, because a second copy would count every page view twice; a re-grant calls `reset()` for a fresh identity and then `opt_in_tracking()`. `deleteProfileOnWithdraw` (default `true`, Mixpanel's own) also deletes an identified user's profile on withdrawal. `region` sets the EU or India host, `trackPageViews` defaults to `"url-with-path"` so route changes count, and `initOptions` passes Mixpanel's own settings through.

`onReject: "silence"` loads Mixpanel opted out on every page instead, for sites whose code calls Mixpanel everywhere or uses its feature flags. `mixpanelSync()` keeps a Mixpanel you load yourself in sync with consent. `mixpanelTrack()`, `mixpanelIdentify()`, `mixpanelPeopleSet()`, `mixpanelRegister()` and `mixpanelReset()` do nothing before consent and while it is withdrawn.
