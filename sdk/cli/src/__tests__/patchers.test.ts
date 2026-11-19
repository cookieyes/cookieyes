import { describe, expect, it } from "vitest";
import {
  insertImport,
  patchNextjsLayout,
  patchNextjsPagesApp,
  patchNuxtApp,
  patchNuxtConfig,
  patchVueApp,
  patchVueMain,
} from "../utils/patchers.js";

describe("insertImport", () => {
  it("inserts after the last existing import", () => {
    const src = `import a from "a";\nimport b from "b";\n\nexport const x = 1;\n`;
    const out = insertImport(src, `import c from "c";`);
    expect(out).toBe(
      `import a from "a";\nimport b from "b";\nimport c from "c";\n\nexport const x = 1;\n`,
    );
  });

  it("prepends if there are no existing imports", () => {
    const src = `export const x = 1;\n`;
    const out = insertImport(src, `import x from "x";`);
    expect(out).toBe(`import x from "x";\nexport const x = 1;\n`);
  });
});

describe("patchNextjsLayout", () => {
  const layout = [
    `import type { ReactNode } from "react";`,
    ``,
    `export default function RootLayout({ children }: { children: ReactNode }) {`,
    `  return (`,
    `    <html lang="en">`,
    `      <body>`,
    `        {children}`,
    `      </body>`,
    `    </html>`,
    `  );`,
    `}`,
  ].join("\n");

  it("inserts the import and wires <CookieYesRoot /> next to {children}", () => {
    const out = patchNextjsLayout(layout);
    expect(out).not.toBeNull();
    expect(out!).toContain(`import { CookieYesRoot } from "@/components/consent-manager";`);
    expect(out!).toContain("{children}\n        <CookieYesRoot />");
  });

  it("returns null if the layout is already wired up", () => {
    const alreadyWired = [
      `import type { ReactNode } from "react";`,
      `import { CookieYesRoot } from "@/components/consent-manager";`,
      ``,
      `export default function RootLayout({ children }: { children: ReactNode }) {`,
      `  return (`,
      `    <html>`,
      `      <body>`,
      `        {children}`,
      `        <CookieYesRoot />`,
      `      </body>`,
      `    </html>`,
      `  );`,
      `}`,
    ].join("\n");
    expect(patchNextjsLayout(alreadyWired)).toBeNull();
  });
});

describe("patchNextjsPagesApp", () => {
  const pagesApp = [
    `import type { AppProps } from "next/app";`,
    ``,
    `export default function App({ Component, pageProps }: AppProps) {`,
    `  return <Component {...pageProps} />;`,
    `}`,
  ].join("\n");

  it("imports CookieYesRoot and wraps <Component {...pageProps} /> with a fragment", () => {
    const out = patchNextjsPagesApp(pagesApp);
    expect(out).not.toBeNull();
    expect(out!).toContain(`import { CookieYesRoot } from "@/components/consent-manager";`);
    expect(out!).toContain(
      "<>\n      <Component {...pageProps} />\n      <CookieYesRoot />\n    </>",
    );
  });

  it("returns null when _app.tsx is already wired up", () => {
    const alreadyWired = [
      `import type { AppProps } from "next/app";`,
      `import { CookieYesRoot } from "@/components/consent-manager";`,
      ``,
      `export default function App({ Component, pageProps }: AppProps) {`,
      `  return (`,
      `    <>`,
      `      <Component {...pageProps} />`,
      `      <CookieYesRoot />`,
      `    </>`,
      `  );`,
      `}`,
    ].join("\n");
    expect(patchNextjsPagesApp(alreadyWired)).toBeNull();
  });

  it("returns null if the file does not contain <Component {...pageProps} />", () => {
    const odd = [
      `import type { AppProps } from "next/app";`,
      ``,
      `export default function App(props: AppProps) {`,
      `  const { Component, pageProps } = props;`,
      `  return <Component {...pageProps} key="custom" />;`,
      `}`,
    ].join("\n");
    expect(patchNextjsPagesApp(odd)).toBeNull();
  });
});

describe("patchVueMain", () => {
  const createVue = [
    `import { createApp } from 'vue'`,
    `import App from './App.vue'`,
    ``,
    `createApp(App).mount('#app')`,
    ``,
  ].join("\n");

  it("splits the one-line create-vue entry and keeps its style", () => {
    expect(patchVueMain(createVue)).toBe(
      [
        `import { createApp } from 'vue'`,
        `import App from './App.vue'`,
        `import { setupConsent } from './consent-manager'`,
        ``,
        `const app = createApp(App)`,
        `setupConsent(app)`,
        `app.mount('#app')`,
        ``,
      ].join("\n"),
    );
  });

  it("keeps .use calls in the chain and the semicolon style", () => {
    const out = patchVueMain(
      [
        `import { createApp } from "vue";`,
        `import router from "./router";`,
        `createApp(App).use(router).mount("#app");`,
      ].join("\n"),
    );
    expect(out).toContain(
      `const app = createApp(App).use(router);\nsetupConsent(app);\napp.mount("#app");`,
    );
    expect(out).toContain(`import { setupConsent } from "./consent-manager";`);
  });

  it("inserts the call before mount when the app is already a variable", () => {
    const out = patchVueMain(
      [
        `import { createApp } from "vue";`,
        `import App from "./App.vue";`,
        ``,
        `const app = createApp(App);`,
        `app.use(router);`,
        `app.mount("#app");`,
      ].join("\n"),
    );
    expect(out).toContain(`app.use(router);\nsetupConsent(app);\napp.mount("#app");`);
    expect(out).toContain(`import { setupConsent } from "./consent-manager";`);
  });

  it("returns null when already patched", () => {
    expect(patchVueMain(patchVueMain(createVue) as string)).toBeNull();
  });

  it("returns null for shapes it cannot place the call in", () => {
    expect(patchVueMain(`import { createApp } from "vue";\nrender(createApp(App));\n`)).toBeNull();
    expect(patchVueMain(`const app = createApp(App);\nstart(app);\n`)).toBeNull();
    // A name clash with `app` would break the rewrite.
    expect(patchVueMain(`const app = 1;\ncreateApp(App).mount("#app");\n`)).toBeNull();
    // `insertImport` would split a multi-line import.
    expect(
      patchVueMain(`import {\n  createApp,\n} from "vue";\ncreateApp(App).mount("#app");\n`),
    ).toBeNull();
  });
});

describe("patchVueApp", () => {
  const createVue = [
    `<script setup lang="ts">`,
    `import HelloWorld from './components/HelloWorld.vue'`,
    `</script>`,
    ``,
    `<template>`,
    `  <header>`,
    `    <HelloWorld msg="Hi" />`,
    `  </header>`,
    `</template>`,
    ``,
  ].join("\n");

  it("imports the root and renders it first in the template", () => {
    expect(patchVueApp(createVue)).toBe(
      [
        `<script setup lang="ts">`,
        `import HelloWorld from './components/HelloWorld.vue'`,
        `import CookieYesRoot from './components/CookieYesRoot.vue'`,
        `</script>`,
        ``,
        `<template>`,
        `  <CookieYesRoot />`,
        `  <header>`,
        `    <HelloWorld msg="Hi" />`,
        `  </header>`,
        `</template>`,
        ``,
      ].join("\n"),
    );
  });

  it("adds an import line to a script setup block that has none", () => {
    const out = patchVueApp(
      `<script setup>\nconst n = 1;\n</script>\n<template><p /></template>\n`,
    );
    expect(out).toBe(
      `<script setup>\nimport CookieYesRoot from "./components/CookieYesRoot.vue";\nconst n = 1;\n</script>\n<template>\n  <CookieYesRoot /><p /></template>\n`,
    );
  });

  it("works when the template comes before the script", () => {
    const out = patchVueApp(
      `<template>\n  <main />\n</template>\n\n<script setup>\nimport a from "./a";\n</script>\n`,
    );
    expect(out).toContain(`<template>\n  <CookieYesRoot />\n  <main />`);
    expect(out).toContain(`import a from "./a";\nimport CookieYesRoot from`);
  });

  it("returns null when already patched", () => {
    expect(patchVueApp(patchVueApp(createVue) as string)).toBeNull();
  });

  it("returns null for an Options API component or a file without a template", () => {
    expect(
      patchVueApp(`<script>\nexport default {};\n</script>\n<template><div /></template>\n`),
    ).toBeNull();
    expect(patchVueApp(`<script setup>\nconst n = 1;\n</script>\n`)).toBeNull();
    expect(
      patchVueApp(
        `<script setup>\nimport {\n  a,\n} from "./a";\n</script>\n<template><i /></template>\n`,
      ),
    ).toBeNull();
  });
});

describe("patchNuxtConfig", () => {
  // The config `npm create nuxt` writes: single quotes, no semicolons, no trailing commas.
  const starter = [
    `// https://nuxt.com/docs/api/configuration/nuxt-config`,
    `export default defineNuxtConfig({`,
    `  compatibilityDate: '2025-07-15',`,
    `  devtools: { enabled: true }`,
    `})`,
    ``,
  ].join("\n");

  it("creates the modules array as the first key when the config has none", () => {
    expect(patchNuxtConfig(starter)).toBe(
      [
        `// https://nuxt.com/docs/api/configuration/nuxt-config`,
        `export default defineNuxtConfig({`,
        `  modules: ['@cookieyes/nuxt'],`,
        `  compatibilityDate: '2025-07-15',`,
        `  devtools: { enabled: true }`,
        `})`,
        ``,
      ].join("\n"),
    );
  });

  it("adds the array to an empty or one-line config", () => {
    expect(patchNuxtConfig(`export default defineNuxtConfig({})\n`)).toBe(
      `export default defineNuxtConfig({ modules: ["@cookieyes/nuxt"] })\n`,
    );
    expect(patchNuxtConfig(`export default defineNuxtConfig({ ssr: false });`)).toBe(
      `export default defineNuxtConfig({ modules: ["@cookieyes/nuxt"], ssr: false });`,
    );
  });

  it("appends to a multi-line modules array, keeping its trailing comma style", () => {
    const withComma = [
      `export default defineNuxtConfig({`,
      `  modules: [`,
      `    "@nuxt/eslint",`,
      `    ["@nuxt/image", { quality: 80 }],`,
      `  ],`,
      `});`,
    ].join("\n");
    expect(patchNuxtConfig(withComma)).toBe(
      [
        `export default defineNuxtConfig({`,
        `  modules: [`,
        `    "@nuxt/eslint",`,
        `    ["@nuxt/image", { quality: 80 }],`,
        `    "@cookieyes/nuxt",`,
        `  ],`,
        `});`,
      ].join("\n"),
    );
    const withoutComma = `defineNuxtConfig({\n  modules: [\n    '@nuxt/ui'\n  ]\n})`;
    expect(patchNuxtConfig(withoutComma)).toBe(
      `defineNuxtConfig({\n  modules: [\n    '@nuxt/ui',\n    '@cookieyes/nuxt'\n  ]\n})`,
    );
  });

  it("appends to a one-line or empty modules array", () => {
    expect(patchNuxtConfig(`defineNuxtConfig({ modules: ['@nuxt/ui'] })`)).toBe(
      `defineNuxtConfig({ modules: ['@nuxt/ui', '@cookieyes/nuxt'] })`,
    );
    expect(patchNuxtConfig(`defineNuxtConfig({ modules: ["a",] })`)).toBe(
      `defineNuxtConfig({ modules: ["a", "@cookieyes/nuxt"] })`,
    );
    expect(patchNuxtConfig(`defineNuxtConfig({\n  modules: [],\n})`)).toBe(
      `defineNuxtConfig({\n  modules: ["@cookieyes/nuxt"],\n})`,
    );
  });

  it("finds the top-level modules key past nested objects, strings and comments", () => {
    const src = [
      `export default defineNuxtConfig({`,
      `  // a } in a comment, and one in a string: "}"`,
      `  app: { head: { title: "a } b" } },`,
      `  /* modules: ["x"] */`,
      `  modules: ["@nuxt/ui"],`,
      `})`,
    ].join("\n");
    expect(patchNuxtConfig(src)).toContain(`modules: ["@nuxt/ui", "@cookieyes/nuxt"],`);
  });

  it("returns null when the module is already listed", () => {
    expect(patchNuxtConfig(patchNuxtConfig(starter) as string)).toBeNull();
    expect(patchNuxtConfig(`defineNuxtConfig({ modules: [["@cookieyes/nuxt", {}]] })`)).toBeNull();
  });

  it("returns null for shapes it cannot edit safely", () => {
    // No object literal to edit.
    expect(
      patchNuxtConfig(`const config = {};\nexport default defineNuxtConfig(config);`),
    ).toBeNull();
    expect(patchNuxtConfig(`export default { modules: [] };`)).toBeNull();
    // A spread may carry its own modules, which a new key would override or be overridden by.
    expect(patchNuxtConfig(`defineNuxtConfig({ ...base, ssr: true })`)).toBeNull();
    // Not an array literal.
    expect(patchNuxtConfig(`defineNuxtConfig({ modules: shared })`)).toBeNull();
    // A comment in the array could swallow the added entry.
    expect(patchNuxtConfig(`defineNuxtConfig({ modules: ["a" /* b */] })`)).toBeNull();
    // A nested modules key is not the module list, but is left alone rather than guessed at.
    expect(patchNuxtConfig(`defineNuxtConfig({ vite: { css: { modules: {} } } })`)).toBeNull();
    // Unbalanced brackets.
    expect(patchNuxtConfig(`defineNuxtConfig({ modules: ["a"`)).toBeNull();
    expect(patchNuxtConfig(`defineNuxtConfig({ ssr: true`)).toBeNull();
    // Two configs in one file.
    expect(patchNuxtConfig(`defineNuxtConfig({});\ndefineNuxtConfig({});`)).toBeNull();
  });
});

describe("patchNuxtApp", () => {
  it("renders CookieYesRoot first, before the page content", () => {
    const starter = [
      `<template>`,
      `  <div>`,
      `    <NuxtRouteAnnouncer />`,
      `    <NuxtWelcome />`,
      `  </div>`,
      `</template>`,
      ``,
    ].join("\n");
    expect(patchNuxtApp(starter)).toBe(
      [
        `<template>`,
        `  <CookieYesRoot />`,
        `  <div>`,
        `    <NuxtRouteAnnouncer />`,
        `    <NuxtWelcome />`,
        `  </div>`,
        `</template>`,
        ``,
      ].join("\n"),
    );
  });

  it("adds no import, since Nuxt auto-imports the component", () => {
    const out = patchNuxtApp(
      `<script setup lang="ts">\nconst x = 1\n</script>\n\n<template>\n  <NuxtPage />\n</template>\n`,
    );
    expect(out).toBe(
      `<script setup lang="ts">\nconst x = 1\n</script>\n\n<template>\n  <CookieYesRoot />\n  <NuxtPage />\n</template>\n`,
    );
  });

  it("returns null when already patched or when there is no template", () => {
    expect(patchNuxtApp(`<template>\n  <CookieYesRoot />\n</template>\n`)).toBeNull();
    expect(patchNuxtApp(`<script setup>\nconst n = 1\n</script>\n`)).toBeNull();
  });
});
