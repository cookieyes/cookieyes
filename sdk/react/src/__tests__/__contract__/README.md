# Rendering contract

These files record what the React components put on the page today: every
element, every attribute (`data-cy-part`, `data-cy-state`, roles, ARIA), every
`--cy-*` theme value, and how focus, Tab, Escape and screen-reader
announcements behave. `contract.test.tsx` produces them and fails when the
React output stops matching.

They are the reference the framework-free UI layer and every other
framework's banner are built and tested against. A difference here is a
change for every framework at once.

## Files

| File | What it records |
|---|---|
| `banner.gdpr.json`, `banner.ccpa.json` | The banner, its delayed screen-reader announcement, Tab order and focus trap |
| `banner.focus-on-close.json` | Where focus goes after Accept, Reject or the close button |
| `banner.server.json` | The server-rendered banner: the markup that is visible before JavaScript runs |
| `preferences.json` | The preferences dialog, its toggles before and after a change, keyboard behaviour |
| `preferences.focus-on-close.json` | Where focus goes after each way of closing the dialog |
| `optout.json` | The opt-out dialog and its keyboard behaviour |
| `optout.confirmed.json` | The confirmation after opting out and its 10 second countdown |
| `optout.saved-without-opt-out.json` | Saving without opting out closes at once |
| `reload-notice.json` | The reload notice after revoking a tool that needs a reload |
| `recall.visibility.json` | When the recall button is shown |
| `recall.gdpr.json`, `recall.ccpa.json` | The recall button and what it opens |
| `theme.json` | The nine theme settings, the variables each drives, light and dark values |
| `theme.applied.json` | What each component writes for each colour scheme and for a custom theme |

Generated ids are renamed `id-1`, `id-2`, ... in the order they appear, and
icon path data is left out, so a React upgrade or an icon redraw does not
count as a change.

## Changing a recording

A recording only changes on purpose:

```bash
UPDATE_CONTRACT=1 pnpm --filter @cookieyes/react test contract
pnpm lint:fix
```

Review the diff of the JSON files as part of the pull request. A change here
needs the same change in every framework's banner.

Things that are known to be wrong today are listed in
[KNOWN-ISSUES.md](./KNOWN-ISSUES.md) instead of being treated as correct.
