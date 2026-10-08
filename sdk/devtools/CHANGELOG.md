# @cookieyes/devtools

## 0.1.0

### Minor Changes

- 085d370: New package: `@cookieyes/devtools`, a panel for your dev server that shows what the SDK is doing and lets you test it.

  ```tsx
  import { CookieYesDevtools } from "@cookieyes/devtools";
  import "@cookieyes/devtools/styles.css";

  <CookieYesDevtools />;
  ```

  **See what the SDK is doing.** Saved and unsaved consent side by side, integration statuses, blocked requests, Google Consent Mode signals, and a searchable timeline of events that survives a reload. Open the preferences or opt-out dialog, reset consent, or download a debug file for a bug report.

  **Test without a VPN.** Force any country or US state and see the regulation it gets, and switch the banner's language live.

  **Find scripts that load without consent.** The Scanner lists third-party scripts, iframes, requests, cookies and localStorage keys, shows which ones the SDK manages, and flags anything that appeared before its category was granted or after it was withdrawn. Each unmanaged one comes with the code that would gate it.

  **Nothing reaches production.** A production build resolves an empty component and an empty stylesheet, so you can leave both imports in place. Install it as a dev dependency; it needs no flag. React and Next.js only for now, and it needs the `@cookieyes/core` and `@cookieyes/react` released alongside it.
