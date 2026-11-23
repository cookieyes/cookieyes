import { describe, expect, it } from "vitest";
import {
  insertImport,
  patchNextjsLayout,
  patchNextjsPagesApp,
  patchNuxtApp,
  patchNuxtConfig,
  patchSvelteApp,
  patchSveltekitHooks,
  patchSveltekitLayout,
  patchSvelteMain,
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

describe("patchSvelteMain", () => {
  const viteMain = `import { mount } from 'svelte'\nimport './app.css'\nimport App from './App.svelte'\n\nconst app = mount(App, { target: document.getElementById('app')! })\n\nexport default app\n`;

  it("adds the stylesheet import after the last import, in the file's quote style", () => {
    expect(patchSvelteMain(viteMain)).toBe(
      `import { mount } from 'svelte'\nimport './app.css'\nimport App from './App.svelte'\nimport '@cookieyes/svelte/styles.css'\n\nconst app = mount(App, { target: document.getElementById('app')! })\n\nexport default app\n`,
    );
  });

  it("uses double quotes and semicolons when the file does", () => {
    const out = patchSvelteMain(`import App from "./App.svelte";\nmount(App);\n`);
    expect(out).toContain(`import "@cookieyes/svelte/styles.css";`);
  });

  it("returns null when the stylesheet is already imported", () => {
    expect(patchSvelteMain(`${viteMain}import "@cookieyes/svelte/styles.css";\n`)).toBeNull();
  });

  it("returns null for a file that does not import a Svelte component", () => {
    expect(patchSvelteMain(`import { start } from "./start";\nstart();\n`)).toBeNull();
  });

  it("returns null when an import spans several lines", () => {
    expect(
      patchSvelteMain(`import {\n  mount,\n} from 'svelte'\nimport App from './App.svelte'\n`),
    ).toBeNull();
  });
});

describe("patchSvelteApp", () => {
  const viteApp = `<script lang="ts">\n  import Counter from './lib/Counter.svelte'\n</script>\n\n<main>\n  <Counter />\n</main>\n\n<style>\n  main { color: red; }\n</style>\n`;

  it("imports the root in the script and renders it before the style block", () => {
    expect(patchSvelteApp(viteApp)).toBe(
      `<script lang="ts">\n  import Counter from './lib/Counter.svelte'\n  import CookieYesRoot from './lib/CookieYesRoot.svelte'\n</script>\n\n<main>\n  <Counter />\n</main>\n\n<CookieYesRoot />\n\n<style>\n  main { color: red; }\n</style>\n`,
    );
  });

  it("finds a script block whose closing tag has a space before the bracket", () => {
    const out = patchSvelteApp(`<script>\n  import A from "./A.svelte";\n</script >\n\n<A />\n`);
    expect(out).toContain(`import CookieYesRoot from "./lib/CookieYesRoot.svelte";\n</script >`);
  });

  it("appends the element at the end when there is no style block", () => {
    const out = patchSvelteApp(`<script>\n  import A from "./A.svelte";\n</script>\n\n<A />\n`);
    expect(out).toBe(
      `<script>\n  import A from "./A.svelte";\n  import CookieYesRoot from "./lib/CookieYesRoot.svelte";\n</script>\n\n<A />\n\n<CookieYesRoot />\n`,
    );
  });

  it("puts the import on its own line when the script has no imports", () => {
    const out = patchSvelteApp(`<script lang="ts">\n  let n = 0;\n</script>\n<p>{n}</p>\n`);
    expect(out).toContain(
      `<script lang="ts">\n  import CookieYesRoot from "./lib/CookieYesRoot.svelte";\n  let n = 0;\n</script>`,
    );
    expect(out?.endsWith("<p>{n}</p>\n\n<CookieYesRoot />\n")).toBe(true);
  });

  it("handles a script that starts on the same line as its content", () => {
    const out = patchSvelteApp(`<script>let n = 0;</script>\n<p>{n}</p>\n`);
    expect(out).toContain(
      `<script>\n  import CookieYesRoot from "./lib/CookieYesRoot.svelte";\nlet n = 0;</script>`,
    );
  });

  it("skips a module script and edits the instance script", () => {
    const out = patchSvelteApp(
      `<script module>\n  export const x = 1;\n</script>\n\n<script>\n  import A from './A.svelte'\n</script>\n\n<A />\n`,
    );
    expect(out).toContain(`<script module>\n  export const x = 1;\n</script>`);
    expect(out).toContain(`import A from './A.svelte'\n  import CookieYesRoot from`);
  });

  it("skips a legacy context=module script too", () => {
    expect(
      patchSvelteApp(`<script context="module">\n  export const x = 1;\n</script>\n<p />\n`),
    ).toBeNull();
  });

  it("returns null when already patched", () => {
    expect(
      patchSvelteApp(`<script>\n  import CookieYesRoot from './x.svelte'\n</script>\n`),
    ).toBeNull();
  });

  it("returns null when there is no script block", () => {
    expect(patchSvelteApp(`<main />\n`)).toBeNull();
  });

  it("returns null when an import in the script spans several lines", () => {
    expect(
      patchSvelteApp(`<script>\n  import {\n    a,\n  } from './a'\n</script>\n<p />\n`),
    ).toBeNull();
  });
});

describe("patchSveltekitHooks", () => {
  const imports = `import { cookieyesHandle } from "@cookieyes/sveltekit";\nimport { config } from "./lib/cookieyes";\n`;

  it("wraps a const handle in sequence, keeping its type annotation", () => {
    const src = `import type { Handle } from '@sveltejs/kit';\n\nexport const handle: Handle = async ({ event, resolve }) => {\n  return resolve(event);\n};\n`;
    const out = patchSveltekitHooks(src);
    expect(out).toContain(
      `import type { Handle } from '@sveltejs/kit';\nimport { sequence } from '@sveltejs/kit/hooks';`,
    );
    expect(out).toContain(`import { cookieyesHandle } from '@cookieyes/sveltekit';`);
    expect(out).toContain(`const userHandle: Handle = async ({ event, resolve }) => {`);
    expect(out).not.toContain("export const userHandle");
    expect(
      out?.endsWith(`export const handle = sequence(cookieyesHandle(config), userHandle);\n`),
    ).toBe(true);
  });

  it("wraps a handle function declaration", () => {
    const out = patchSveltekitHooks(
      `export async function handle({ event, resolve }) {\n  return resolve(event);\n}\n`,
    );
    expect(out).toContain(`async function userHandle({ event, resolve }) {`);
    expect(out).toContain(`export const handle = sequence(cookieyesHandle(config), userHandle);`);
    expect(out).toContain(`import { sequence } from "@sveltejs/kit/hooks";`);
  });

  it("puts cookieyesHandle first in an existing sequence", () => {
    const src = `import { sequence } from "@sveltejs/kit/hooks";\n\nexport const handle = sequence(a, b);\n`;
    const out = patchSveltekitHooks(src);
    expect(out).toContain(`export const handle = sequence(cookieyesHandle(config), a, b);`);
    expect(out).toContain(imports.trim());
    expect(out?.match(/import \{ sequence \}/g)).toHaveLength(1);
  });

  it("reuses a sequence import when wrapping a const handle", () => {
    const src = `import { sequence } from "@sveltejs/kit/hooks";\nexport const handle = async ({ event, resolve }) => resolve(event);\n`;
    expect(patchSveltekitHooks(src)?.match(/import \{ sequence \}/g)).toHaveLength(1);
  });

  it("returns null when already patched", () => {
    expect(
      patchSveltekitHooks(`${imports}export const handle = cookieyesHandle(config);\n`),
    ).toBeNull();
  });

  it("returns null for shapes it cannot rewrite safely", () => {
    // handle used twice, re-exported, no handle at all, an own config, a multi-line import,
    // sequence used without being imported, and a sequence handle without the import.
    expect(patchSveltekitHooks(`const handle = h;\nexport { handle };\n`)).toBeNull();
    expect(patchSveltekitHooks(`const mine = h;\nexport { mine as handle };\n`)).toBeNull();
    expect(patchSveltekitHooks(`export const handleError = () => {};\n`)).toBeNull();
    expect(patchSveltekitHooks(`const config = 1;\nexport const handle = h;\n`)).toBeNull();
    expect(
      patchSveltekitHooks(`import {\n  a,\n} from "x";\nexport const handle = h;\n`),
    ).toBeNull();
    expect(patchSveltekitHooks(`export const handle = h;\nsequence(a);\n`)).toBeNull();
    expect(patchSveltekitHooks(`export const handle = sequence(a, b);\n`)).toBeNull();
    expect(patchSveltekitHooks(`export const handle = h;\nexport const x = handle;\n`)).toBeNull();
  });
});

describe("patchSveltekitLayout", () => {
  const kitLayout = `<script lang="ts">\n  import favicon from '$lib/assets/favicon.svg';\n\n  let { children } = $props();\n</script>\n\n<svelte:head>\n  <link rel="icon" href={favicon} />\n</svelte:head>\n\n{@render children()}\n`;

  it("wraps the page content and adds the imports and data", () => {
    expect(patchSveltekitLayout(kitLayout, true)).toBe(
      `<script lang="ts">\n  import favicon from '$lib/assets/favicon.svg';\n  import { CookieYesRoot } from '@cookieyes/sveltekit';\n  import { config } from '../lib/cookieyes';\n\n  let { data, children } = $props();\n</script>\n\n<svelte:head>\n  <link rel="icon" href={favicon} />\n</svelte:head>\n\n<CookieYesRoot {config} state={data.consent}>\n  {@render children()}\n</CookieYesRoot>\n`,
    );
  });

  it("finds a script block whose closing tag has a space before the bracket", () => {
    const out = patchSveltekitLayout(kitLayout.replace("</script>", "</script >"), true);
    expect(out).toContain("let { data, children } = $props();\n</script >");
  });

  it("leaves out data and state when withState is false", () => {
    const out = patchSveltekitLayout(kitLayout, false);
    expect(out).toContain(`let { children } = $props();`);
    expect(out).toContain(`<CookieYesRoot {config}>\n  {@render children()}\n</CookieYesRoot>`);
  });

  it("keeps an optional children call and an existing data prop", () => {
    const out = patchSveltekitLayout(
      `<script>\n  let { data, children } = $props();\n</script>\n\n<main>\n  {@render children?.()}\n</main>\n`,
      true,
    );
    expect(out).toContain(`let { data, children } = $props();`);
    expect(out).toContain(
      `<main>\n  <CookieYesRoot {config} state={data.consent}>\n    {@render children?.()}\n  </CookieYesRoot>\n</main>`,
    );
    expect(out).toContain(`<script>\n  import { CookieYesRoot } from "@cookieyes/sveltekit";`);
  });

  it("accepts a named props type and skips a module script", () => {
    const out = patchSveltekitLayout(
      `<script module>\n  export const x = 1;\n</script>\n<script lang="ts">\n  import type { LayoutProps } from './$types';\n  let { children }: LayoutProps = $props();\n</script>\n{@render children()}\n`,
      true,
    );
    expect(out).toContain(`let { data, children }: LayoutProps = $props();`);
    expect(out).toContain(`import { CookieYesRoot } from '@cookieyes/sveltekit';`);
  });

  it("returns null when already patched", () => {
    expect(
      patchSveltekitLayout(`<CookieYesRoot {config}>{@render children()}</CookieYesRoot>`, true),
    ).toBeNull();
  });

  it("returns null for layouts it cannot patch safely", () => {
    const render = `\n{@render children()}\n`;
    // no script, no children prop, inline props type, two renders, render inside a block,
    // a multi-line import, an own config
    expect(patchSveltekitLayout(render, true)).toBeNull();
    expect(
      patchSveltekitLayout(`<script>\n  let { data } = $props();\n</script>${render}`, true),
    ).toBeNull();
    expect(
      patchSveltekitLayout(
        `<script lang="ts">\n  let { children }: { children: Snippet } = $props();\n</script>${render}`,
        true,
      ),
    ).toBeNull();
    expect(
      patchSveltekitLayout(
        `<script>\n  let { children } = $props();\n</script>${render}${render}`,
        true,
      ),
    ).toBeNull();
    expect(
      patchSveltekitLayout(
        `<script>\n  let { children } = $props();\n</script>\n{#if x}{@render children()}{/if}\n`,
        true,
      ),
    ).toBeNull();
    expect(
      patchSveltekitLayout(
        `<script>\n  import {\n    a,\n  } from "x";\n  let { children } = $props();\n</script>${render}`,
        true,
      ),
    ).toBeNull();
    expect(
      patchSveltekitLayout(
        `<script>\n  const config = 1;\n  let { children } = $props();\n</script>${render}`,
        true,
      ),
    ).toBeNull();
  });
});
