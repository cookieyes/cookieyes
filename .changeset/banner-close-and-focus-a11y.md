---
"@cookieyes/core": minor
"@cookieyes/react": minor
---

Make the banner modal, give it a close button that only closes, and fix focus and screen-reader gaps in the banner and the opt-out dialog.

**`Banner.Close` no longer accepts.** It used to call `acceptAll()`, so closing the banner recorded "accept everything" that the visitor never chose. It now calls the new `dismissBanner()`: the banner hides for the current page view, nothing is saved, and nothing is granted or denied. Under GDPR non-essential categories stay off; under CCPA the defaults stay as they are. The banner shows again on the next page load. **If you rely on `Banner.Close` granting consent, call `acceptAll()` yourself.**

**`<CookieBanner />` shows the close button under every regulation**, not only CCPA. After a dismiss, `<RecallButton />` appears, so the visitor can still make a choice.

**New: `dismissBanner()` and `isBannerDismissed`.** On `ConsentManager` in `@cookieyes/core`, on `useConsentActions()` and on the runtime snapshot in `@cookieyes/react`. `activeUI` no longer reports `"banner"` once it is dismissed, and `resetConsent()` clears the dismissal.

**The banner is a modal dialog.** It carries `aria-modal="true"`, and `Tab` / `Shift+Tab` stay inside it until the visitor answers. It does not take focus when it appears: the first `Tab` from the page moves onto its first control. `Escape` still does not close it.

**Focus is no longer lost when the banner closes.** After Accept All, Reject All or the close button, focus moves to the recall button. The same happens when the opt-out dialog closes itself after its countdown.

**Buttons that open a dialog say so.** Customise, Do Not Sell and `<RecallButton />` carry `aria-haspopup="dialog"` and `aria-controls` pointing at the dialog they open. The dialogs now have fixed ids: `cookieyes-preferences` and `cookieyes-optout`. An `id` you pass to `Preferences.Root` or `OptOut.Root` still wins, but the buttons keep pointing at the default id.

**The opt-out confirmation is read out.** After Save, focus moves onto the confirmation, so screen readers read it. The ticking countdown stays hidden from them so it is not re-announced every second; instead they hear one fixed sentence that the dialog closes automatically in 10 seconds.

**The opt-out confirmation shows only after an opt-out.** Saving with the box unticked now closes the dialog straight away.

**The focus trap pulls focus in from outside.** If focus is on the page behind a trapping dialog, or on the dialog container itself, `Tab` moves to the first control and `Shift+Tab` to the last. This also fixes `Shift+Tab` leaving the preferences and opt-out dialogs right after they open.

Repeated button, icon and branding markup is now shared, which keeps the bundle within its size budget with no change in output.
