---
"@cookieyes/core": minor
"@cookieyes/react": minor
---

Every consent record now carries what you need to prove the decision later.

In self-hosted mode, each record sent to your `apiUrl` or `backend` gains five fields:

- **`decidedAt`**: when the visitor decided (ISO 8601, UTC), not when the record was sent.
- **`taxonomyHash`**: the category set the decision was made against, the same value the consent cookie uses.
- **`action`**: `accept_all`, `reject_all`, `accept_selected` or `save`.
- **`source`**: where the decision was made: `banner`, `preferences`, `optout`, or `api` for a call from your own code.
- **`recordId`**: the same decision always gets the same id, so your server can drop a record it already has. Two different decisions never share one, including a visitor who changes their mind and then changes back.

Nothing changes for existing code. The new fields are optional on the `ConsentPayload` type, because records saved by older versions do not have them.

**Recording where a decision came from.** The SDK's own banner and dialogs set `source` for you. In your own UI, pass it once:

- React: `useConsentActions("banner")`. The returned actions are unchanged, so `onClick={acceptAll}` keeps working.
- Core: `consentStore.getState().saveConsents("all", "banner")` or `consentManager.acceptAll("banner")`. An action wired straight to a click handler is recorded as `"api"`.

`ConsentSource` and `ConsentAction` are exported as types.

**A record that fails to send is now noticed.** An HTTP error such as a 500 used to count as sent, because only a network error made the send fail. Now an HTTP error, a network error, or a `backend` adapter that throws or rejects is treated as a failure, and shows a console warning in development builds. The banner behaves exactly as before.

**A record that fails to send is kept and sent again.** Each record is saved in `localStorage` (key `cookieyes-consent-records`) before it is sent, and removed only once your server confirms it. A kept record is sent again on the next page load, as soon as the browser is back online, and on a timer while the page stays open (about 10 seconds, then 1 minute, then every 5 minutes, each with a random spread). This also covers a visitor closing the tab while a record is still being sent.

- At most 10 records are kept, and a record older than 7 days is removed on the next page load.
- A retried record keeps its `recordId`, so your server can store it once. Drop a record whose `recordId` you already have.
- If storage is full or blocked, the record is still sent once, as before, just not kept for a retry.
- Only self-hosted mode keeps records; `cookie-only` stores nothing new.
