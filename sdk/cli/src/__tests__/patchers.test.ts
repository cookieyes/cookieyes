import { describe, expect, it } from "vitest";
import { insertImport, patchNextjsLayout, patchNextjsPagesApp } from "../utils/patchers.js";

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
