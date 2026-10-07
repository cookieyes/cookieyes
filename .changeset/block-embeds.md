---
"@cookieyes/core": minor
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
"@cookieyes/translations": minor
---

Block YouTube videos, maps and other iframes until consent, on any site.

Put the iframe's address in `data-cy-src` instead of `src`, and its category in `data-cy-category`, then start the blocker once:

```ts
import { blockIframes } from "@cookieyes/core/iframes";

blockIframes(consentManager, consentStore);
```

The browser loads nothing from `data-cy-src`, so the provider receives no request before consent. Each iframe loads once its category is granted and is emptied again if consent is withdrawn. Iframes added later are handled too.

While blocked, an iframe shows a placeholder at its own size: who hosts the content, the category it needs, a button that allows that category, and the provider's privacy policy. YouTube and Vimeo are recognised; `data-cy-provider` and `data-cy-privacy-url` name any other provider. The placeholder text ships in all five languages as `embedPlaceholder`.

In a React or Next.js app, `blockIframes` is exported from `@cookieyes/react` and `@cookieyes/nextjs` for HTML the app does not render itself, such as CMS or Markdown content: `blockIframes(cy.manager, cy)` with `cy` from `getCookieYes()`. `blockIframes` is a separate entry, so apps that do not use it download nothing extra.

`GatedFrame` now names the category by its label, translated, instead of its id, and a development build warns when its `category` is not configured.
