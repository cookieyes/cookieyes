# CookieYes for Developers

> This is the Markdown form of https://developers.cookieyes.com/. The docs index for agents is at /llms.txt. Every page is also available as Markdown: send `Accept: text/markdown` to the page URL.

## Cookie consent that ships in your bundle

Open-source cookie consent SDK for React and Next.js. Manage consent in code, control when third-party tools load, and keep everything in your frontend.

- Next.js: https://developers.cookieyes.com/docs/nextjs/getting-started/installation
- React: https://developers.cookieyes.com/docs/react/getting-started/installation
- JavaScript: https://developers.cookieyes.com/docs/core/getting-started/installation
- Quick start with the CLI: `npx @cookieyes/cli init`

## Performance

The whole point of frontend-native: it barely touches the page. Time to banner and transferred bytes are measured by Cookiebannerbench (throttled mobile, cold cache, p75): https://cookiebannerbench.com/. `@cookieyes/react` is 13.9 KB gzipped with no third-party dependencies.

## Cookie consent features for React and Next.js

Feature-complete consent, with the control surface a serious project needs.

- **Region-aware consent.** Pass the visitor's region and CookieYes applies the right consent experience automatically.
- **Localised without the bundle bloat.** Load the locale you need and override any banner copy per language.
- **Full CSS control.** Customise styles, colours, spacing, and components without being locked into the default design.
- **Built for TypeScript.** Typed APIs and exports help developers catch mistakes earlier and work faster in their editor.
- **Load third-party tools only after consent.** Control when GA4, GTM, Meta Pixel and other integrations can run.

## One consent layer for your stack

Use consent from your app to control when analytics, ads, and other third-party tools can load. Ready-made integrations: Google Analytics 4, Google Tag Manager, Google Ads, Meta Pixel, Microsoft Clarity, PostHog and Segment. A held script never loads until the visitor says yes. See https://developers.cookieyes.com/docs/nextjs/integrations.

## You own the record

Everything runs in your stack. Consent state is yours to persist. You choose how and where it is stored.

- **Frontend only.** Runs in your bundle. No hosted runtime required for the banner and consent logic.
- **MIT licensed.** Fork it. Audit it. Self-host it. No closed-source runtime dependency. Every line is yours to read.
- **Your data, your storage.** Keep consent records in the infrastructure you already use.

## Built to last

Before you add a dependency, you want to know it will still be there. Own it, fork it, keep it forever: the code is public at https://github.com/cookieyes/cookieyes.

## Frequently asked questions

### Do I need a cookie banner in my React app?

If your app sets non-essential cookies or loads tools such as analytics, ads or session replay for visitors covered by GDPR (the EU and UK) or CCPA (California), you need their consent first, or a way to opt out under CCPA. This SDK shows the right banner for each regulation and holds those tools back until the visitor agrees. Check your own obligations with your legal team.

### Does it work with the Next.js App Router?

Yes. `@cookieyes/nextjs` supports the App Router and the Pages Router on Next.js 14 and later. The banner is rendered on the server, and a returning visitor's saved choice is read from the request, so they never see the banner flash in and out.

### Is it free and MIT licensed?

Yes. The SDK is open source under the MIT licence, on GitHub. It runs entirely in your frontend: there is no account to create and no dashboard to set up.

### How big is the bundle?

The whole banner is about 14 KB gzipped, measured against an empty Next.js app. The headless core, and every script integration and translation, are separate imports, so you only ship what you use.

## Install in React or Next.js

No account. No dashboard. Install the package and add consent directly to your site.

- Next.js: https://developers.cookieyes.com/docs/nextjs/getting-started/installation
- React: https://developers.cookieyes.com/docs/react/getting-started/installation
- Documentation: https://developers.cookieyes.com/docs
