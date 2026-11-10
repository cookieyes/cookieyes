---
"@cookieyes/devtools": minor
---

The Scanner now suggests the ready-made integration for Microsoft Advertising UET.

**What changed.** When the Scanner finds the UET tag loading outside the SDK, the suggested fix is now `microsoftUet({ tagId })` from `@cookieyes/scripts`, instead of a generic `customScript()`. The `_uetmsclkid` cookie is recognised as Microsoft's too.
