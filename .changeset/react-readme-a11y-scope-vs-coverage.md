---
"@cookieyes/react": patch
---

Reconcile the README's accessibility scope with what the automated suite actually covers. The stated scope named `<CookieBanner />`, `<CookiePreferences />`, `<CookieOptOut />` and `<RecallButton />`, while the axe suite runs four cases across three components — the banner in both GDPR and CCPA modes, the preferences dialog, and the opt-out dialog. `<RecallButton />` has no axe coverage, and `<ReloadNotice />` is announced to screen readers via `role="alert"` but was not named in the scope at all.

Neither gap is necessarily a defect, but a reviewer who finds one overstated claim stops trusting the rest of the section. The README now names the exact test cases, adds `<ReloadNotice />` to the stated scope, and says plainly which two components the automated suite does not run against.

Also repoints the accessibility test's `docs/accessibility.md` reference, which pointed at a file that did not exist, at the published page. Documentation only; no behaviour change.
