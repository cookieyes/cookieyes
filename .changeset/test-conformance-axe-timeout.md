---
"@cookieyes/test": patch
---

The conformance suite's accessibility check no longer times out on a busy machine.

**Fixed: the axe-core check could fail on time, not on a problem.** Auditing the banner and the preferences dialog in jsdom took just over the test runner's 5 second default on loaded CI runners. That check now allows 30 seconds; what it checks is unchanged.
