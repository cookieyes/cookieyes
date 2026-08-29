---
"@cookieyes/react": patch
---

Fix the "no runtime is registered" error and the "mounted more than once" warning to name `initCookieYes(...)`, the current API, instead of the deprecated `createCookieYes().mount()` builder they mistakenly still referenced. No behavior change — message text only. If you grep your code or logs for the old wording, update to the new text (see [Troubleshooting](https://developer.cookieyes.com/docs/troubleshooting)).
