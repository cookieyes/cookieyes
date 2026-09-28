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
