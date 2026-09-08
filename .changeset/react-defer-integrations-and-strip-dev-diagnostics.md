---
"@cookieyes/react": minor
---

Take a further **2.37 KB** of gzip out of the initial download: the banner goes from 17.24 KB to **14.87 KB** over an empty Next.js app, and banner + preferences + recall from 17.78 KB to **15.41 KB**.

**Integration runner deferred (≈2.1 KB).** The adapter now loads it through core's `_loadIntegrations()` instead of importing `runIntegrations` statically. That static import was the reason splitting the runner in core alone changed this layer's measurement by *nothing* — core emitted a separate chunk and the adapter pulled it straight back in. `integrationsReady` is exposed on the runtime for the same reason it is on core's; see that package's changeset.

**Developer diagnostics stripped from production builds (≈0.27 KB).** Three checks — the CSP-violation listener, the untested-React-version warning, and the WCAG contrast check on a configured theme — are now behind `process.env.NODE_ENV !== "production"` at their **call sites**, not inside their function bodies. Guarding the call sites is what makes them removable: with nothing referencing them, the bundler drops the functions, their de-dupe sets, their message strings and `contrastRatio` entirely, rather than keeping empty shells. Verified absent from a production bundle.

All three are unchanged in development and in tests. None of them does anything a visitor can act on.

Worth recording for anyone tempted to chase this further: the three diagnostic modules are 7.4 KB of *source* and worth only 0.27 KB compressed, because most of that is comments and the contrast checker shares `tokens.ts`. Source size is a poor guide to shipped size, which is why every figure here comes from `pnpm size` (`tools/size/README.md`) rather than from reading the files.
