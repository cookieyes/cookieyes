---
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
"@cookieyes/vue": minor
"@cookieyes/nuxt": minor
"@cookieyes/svelte": minor
"@cookieyes/sveltekit": minor
---

`GatedFrame` now removes its embed as soon as the visitor withdraws the category, without a page reload.

**What changes for you.** Before, an embed that had loaded stayed on the page until the next page load, even after the visitor withdrew consent. Now the placeholder comes back when the withdrawal is saved, and the iframe loads again from the start if the visitor accepts again. This matches `blockIframes()` in `@cookieyes/core`. Because the swap can now happen in the middle of a visit, give the placeholder the same size as the iframe, or the page jumps.

**What stays in the browser.** Cookies and other data the embed already stored are not deleted. They belong to the embed's site, and your page cannot remove them.
