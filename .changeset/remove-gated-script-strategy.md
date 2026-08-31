---
"@cookieyes/core": minor
"@cookieyes/react": minor
---

Remove the `strategy` prop from `<GatedScript />` and the matching `strategy` field from `ScriptEntry`.

The prop accepted `"afterConsent" | "lazyOnce"` and was passed all the way through `registerScript` into the script registry — where nothing ever read it. Both values produced identical behaviour: the script is injected once its category is granted, and injection happens the same way regardless. There was no lazy path.

Because the two values were indistinguishable at runtime, **removing the prop changes no behaviour**. Code that set either value behaved exactly as code that set neither. TypeScript users passing `strategy` will now see a type error; the fix is to delete the prop.

If you need a genuine loading distinction — load immediately versus only after consent, and what happens when consent is withdrawn — that is what the `integrations` config option and the `@cookieyes/scripts` presets provide.
