---
"@cookieyes/cli": patch
---

Correct two inaccuracies in the CLI README. The example transcript showed the backend-mode option as `Offline — no backend, cookie-only`, but the prompt has been labelled `Cookie-only` for some time. The troubleshooting note also said the CLI "skips files that already exist (it won't overwrite your work)" without qualification — that is true of the files it generates, but your layout or entry file is patched in place and reported as `Updated <file>`. Documentation only; no behaviour change.
