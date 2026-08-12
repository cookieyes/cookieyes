---
"@cookieyes/core": patch
---

A failing third-party tag can no longer strand the consent banner — or stop the SDK mounting

Two ordering/isolation fixes on the consent path. Both address the same failure: side effects that
run third-party code were able to throw before the SDK told anyone about the consent decision.

**Accepting or rejecting.** `persist()` ran gated-script injection, integration stop handlers and
the Google Consent Mode broadcast *before* notifying subscribers. Two of those can throw for reasons
outside this SDK's control — script injection touches the DOM, and the Consent Mode broadcast calls
`dataLayer.push`, which Google Tag Manager replaces with its own function that runs
customer-authored templates. When one threw, `notify()` never ran: the consent cookie recorded the
visitor's choice, but the banner stayed on screen until the next page load. The click looked like it
had done nothing.

The decision is now committed (cookie written, categories committed) and broadcast to subscribers
first, and each side effect afterwards is isolated, so no single failure can strand the banner or
prevent the others from running.

**Mounting.** The same broadcast also runs at load, inside `createConsentManager`, where it was
likewise unguarded — so a throwing `dataLayer.push` propagated out of `initCookieYes` and the SDK
never mounted at all. No banner, no consent prompt, caused by an unrelated broken tag. That call and
the load-time stop-handler pass are now isolated too.

Notes on observable behaviour:

- `onConsentUpdate` still fires synchronously within the accept/reject call, as before.
- The Consent Mode broadcast still happens in the same task as the click, so tags see the update
  immediately.
- Consent-gated scripts are now injected just after subscribers are notified rather than just
  before. If you have a callback that inspected the DOM for an injected `<script>` synchronously
  inside a consent listener, it will no longer find it there.
- This is not a latency change. Reordering work inside one task cannot make the browser paint
  sooner; measured click-to-visible-response is ~11ms either way.
