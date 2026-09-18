---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/translations": minor
---

Fix twelve accessibility defects in the banner and dialogs. Every one was confirmed in a browser before and after, and the contrast figures below are measured, not estimated.

**The banner said everything twice.** It carried `aria-live="polite"` on the same element as `role="dialog"`, alongside the visually hidden `aria-live="assertive"` announcer that already exists to announce it. Screen readers announced the banner, then announced it again. The redundant `aria-live` is gone; the deliberate announcer is untouched.

**The banner had no heading.** Its title rendered as a `<p>`, so a screen reader browsing by structure found nothing, while the two dialogs had used `<h2>` all along. `Banner.Title` now renders `<h2>` — the CSS already resets margin and typography on `.cy-banner-title`, so nothing moves on screen. **This is a breaking type change** for anyone writing `useRef<HTMLParagraphElement>` or `ComponentPropsWithoutRef<"p">` against `Banner.Title`.

**Three dialogs were named by a second copy of their own title.** The banner's accessible name was a duplicate of the visible title string, and the preferences dialog was worse: it announced "Cookie preferences" while the heading read "Customise Consent Preferences", so a voice-control user asking for what they could see did not get it. All three are now named with `aria-labelledby` pointing at their own visible heading, so the spoken name and the printed name cannot drift apart. `preferencesDialogLabel` and `optOutDialogLabel` remain on `TranslationMap` — removing them would be a breaking change — but they no longer name the dialogs.

**Colours that failed WCAG.** Six measured failures, all fixed:

| | before | after |
| --- | --- | --- |
| Customise, dark | 3.66:1 | 15.64:1 |
| Do Not Sell, dark | 3.16:1 | 7.22:1 |
| Always Active, dark | 3.35:1 | 7.16:1 |
| Switch track vs page | 1.49:1 | 3.45:1 |
| Switch thumb vs track | 1.49:1 | 3.45:1 |
| Opt-out Cancel text, light | 3.69:1 | 4.83:1 |
| Opt-out Cancel border, light | 1.33:1 | 4.83:1 |

`--cy-primary` is untouched: it is your brand colour, and it still fills the primary buttons. What changed is only where it was drawn as *text on the dark surface*, which no brand dark enough to read on white can survive. On the dark scheme the Customise button falls back to the body text colour — the same choice the hosted CookieYes banner makes — and the Do Not Sell link, which CCPA requires visitors to find, is blended toward white so it stays a link and stays readable. The other three were our own hard-coded values, never checked against the dark surface or against each other.

**The CCPA banner described a button as a link.** `ccpaDescription` told visitors to click a "link" that has always been a `<button>`, so anyone searching for a link did not find one. Corrected in all five languages.

**The opt-out countdown talked over itself.** The closing timer sat inside the `role="status"` region, so the whole confirmation was re-announced every second — ten times for one saved choice. The countdown is now outside the announced content: it is still on screen, and the confirmation is announced once. Its wording also spells out "seconds" instead of "s".

**The CookieYes link opened a new tab without saying so.** One key, `opensInNewTab`, is added to `TranslationMap` and supplied by all five shipped languages; it is appended to the branding link's accessible name on the banner and both dialogs. If you declare a full `TranslationMap` of your own you will need to add it; if you pass a partial object to `i18n.messages`, nothing changes.

One reported issue was not a defect and is unchanged: `aria-modal="false"` on the banner is correct, because the page behind it really does stay interactive — confirmed by clicking through to it with the banner open.
