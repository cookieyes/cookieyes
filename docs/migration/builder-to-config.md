# Migrating from `createCookieYes()` to `initCookieYes(config)`

The chainable builder (`createCookieYes().mode(...).regulation(...).mount()`) is
**deprecated** in favour of a single canonical config object passed to
**`initCookieYes(config)`**.

The builder still works, but it will be **removed after three release cycles**,
per the SDK deprecation policy. The first time you call `createCookieYes()` in a
session you'll see a one-time console warning pointing here.

Migrating is mechanical: each builder method becomes a top-level key.

---

## Before / after

### Before — builder chain

```tsx
"use client";
import { createCookieYes } from "@cookieyes/react";

createCookieYes()
  .mode("self-hosted")
  .backendURL("https://api.example.com/consent")
  .apiKey("secret")
  .regulation("GDPR")
  .colorScheme("dark")
  .theme({ primaryColor: "#6366F1" })
  .i18n({ locale: "en" })
  .blockNetwork({ rules: [{ id: "ga", domain: "google-analytics.com", category: "analytics" }] })
  .reloadOnRevoke(true)
  .onConsentUpdate((state) => console.log(state))
  .mount();
```

### After — config object

```tsx
"use client";
import { initCookieYes } from "@cookieyes/react";

initCookieYes({
  mode: "self-hosted",
  apiUrl: "https://api.example.com/consent", // was .backendURL(...)
  apiKey: "secret",
  regulation: "GDPR",
  colorScheme: "dark",
  theme: { primaryColor: "#6366F1" },
  i18n: { locale: "en" },
  networkBlocker: { rules: [{ id: "ga", domain: "google-analytics.com", category: "analytics" }] }, // was .blockNetwork(...)
  reloadOnRevoke: true,
  onConsentUpdate: (state) => console.log(state),
});
```

---

## Method → key reference

| Builder method | Config key | Notes |
|----------------|-----------|-------|
| `.mode(m)` | `mode` | Unchanged values: `"offline" \| "self-hosted"`. |
| `.regulation(r)` | `regulation` | |
| `.colorScheme(s)` | `colorScheme` | |
| `.theme(t)` | `theme` | |
| `.i18n(i)` | `i18n` | |
| `.backend(b)` | `backend` | |
| `.backendURL(url)` | `apiUrl` | **Renamed key.** |
| `.apiKey(k)` | `apiKey` | |
| `.blockNetwork(c)` | `networkBlocker` | **Renamed key.** |
| `.reloadOnRevoke(v)` | `reloadOnRevoke` | |
| `.onConsentReady(fn)` | `onConsentReady` | |
| `.onConsentUpdate(fn)` | `onConsentUpdate` | |
| `.mount()` | — | No terminal call — `initCookieYes(config)` registers the runtime directly. |

## Core (`getOrCreateConsentRuntime`) users

If you configured core directly, move `regulation` out of the `overrides`
wrapper and rename `backendURL` to `apiUrl`:

```diff
-getOrCreateConsentRuntime({
+initCookieYes({
   mode: "self-hosted",
-  backendURL: "https://api.example.com/consent",
+  apiUrl: "https://api.example.com/consent",
-  overrides: { regulation: "GDPR" },
+  regulation: "GDPR",
 });
```

Both deprecated forms keep working through the deprecation window; if you set
both a deprecated key and its canonical replacement, the canonical key wins and
one warning is logged.

See [Configuration](../configuration.md) for the full option reference.
