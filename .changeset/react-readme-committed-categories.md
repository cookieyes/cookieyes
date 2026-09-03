---
"@cookieyes/react": patch
---

Correct the `useConsent()` return shape in the README. It listed seven fields and omitted `committedCategories` entirely, along with `taxonomyHash` and `reloadNotice`. The omission mattered more than the other two: `committedCategories` is the map that only changes on a real decision (accept, reject, save, reset), and it is the one to gate scripts and embeds on. Anyone following the README would have found only `categories` — the live value, which reflects preference-dialog toggles the visitor has not saved — and gated on that, so a visitor who flips a switch and closes the dialog without saving would have been treated as having consented.

All ten fields are now documented with their types, alongside a note stating which of the two category maps to gate on and what the other is for. Documentation only; no behaviour change.
