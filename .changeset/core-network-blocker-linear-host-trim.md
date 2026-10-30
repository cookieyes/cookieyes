---
"@cookieyes/core": patch
---

The network blocker compares hosts in linear time, so a host or rule domain ending in a long run of dots can no longer slow it down.

**Fixed: trailing dots were removed with a regular expression that took quadratic time.** Matching still treats `example.com.` as `example.com`, exactly as before; only how the dots are removed changed.

Measured with `pnpm size`: no change to `@cookieyes/core`'s bundles.
