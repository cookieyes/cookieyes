import { describe, expect, it } from "vitest";
import {
  insertImport,
  patchNextjsLayout,
  patchNextjsPagesApp,
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
