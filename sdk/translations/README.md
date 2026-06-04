# @cookieyes/translations

Curated translation catalog for the [CookieYes Consent SDK](https://github.com/cookieyes/cookieyes).
Each locale is its own sub-path export, so importing one language never bundles the others.

## Install

```bash
npm install @cookieyes/translations
```

## Usage

Import only the locales you need (each is a **named** export):

```ts
import { en } from "@cookieyes/translations/en";
import { fr } from "@cookieyes/translations/fr";

// Pass into the SDK as the translation map, e.g. with the builder:
//   createCookieYes().i18n({ messages: { en, fr } }).mount();
// or with the core runtime:
//   getOrCreateConsentRuntime({ mode: "offline", i18n: { messages: { en, fr } } });
```

Available sub-paths: `./en`, `./es`, `./fr`, `./de`, `./it`. The package root
(`@cookieyes/translations`) re-exports shared types only — locale tables are not
re-exported there, so importing one language never bundles the others.

## License

[MIT](https://github.com/cookieyes/cookieyes/blob/main/LICENSE) © CookieYes
