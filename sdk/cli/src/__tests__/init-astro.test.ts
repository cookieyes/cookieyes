import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real files in a temporary project; only the terminal and the package install are faked.
const installPackage = vi.hoisted(() => vi.fn());
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
  isCancel: () => false,
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("../utils/install.js", () => ({ installPackage }));

import { note } from "@clack/prompts";
import { runInit } from "../commands/init.js";

let dir: string;

function write(path: string, contents: string): void {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), contents, "utf-8");
}

function read(path: string): string {
  return readFileSync(join(dir, path), "utf-8");
}

const manualSteps = () => vi.mocked(note).mock.calls.filter((c) => c[1] === "Manual step needed");

// What `npm create astro` writes for the basics template: single quotes and tabs.
const STARTER_CONFIG = [
  `// @ts-check`,
  `import { defineConfig } from 'astro/config';`,
  ``,
  `// https://astro.build/config`,
  `export default defineConfig({});`,
  ``,
].join("\n");
const STARTER_LAYOUT = [
  `---`,
  `---`,
  ``,
  `<html lang="en">`,
  `\t<head>`,
  `\t\t<meta charset="utf-8" />`,
  `\t\t<title>Astro Basics</title>`,
  `\t</head>`,
  `\t<body>`,
  `\t\t<slot />`,
  `\t</body>`,
  `</html>`,
  ``,
].join("\n");

beforeEach(() => {
  vi.clearAllMocks();
  dir = mkdtempSync(join(tmpdir(), "cy-astro-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  write("package.json", JSON.stringify({ dependencies: { astro: "^6.0.0" } }));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe("runInit in an Astro project", () => {
  it("sets up Astro's starter: the integration in the config and the root in the layout", async () => {
    write("astro.config.mjs", STARTER_CONFIG);
    write("src/layouts/Layout.astro", STARTER_LAYOUT);
    write(
      "src/pages/index.astro",
      `---\nimport Layout from '../layouts/Layout.astro';\n---\n<Layout />\n`,
    );

    await runInit(["--yes", "--locales=es"]);

    expect(read("astro.config.mjs")).toBe(
      [
        `// @ts-check`,
        `import { defineConfig } from 'astro/config';`,
        `import cookieyes from '@cookieyes/astro';`,
        `import { es } from '@cookieyes/translations/es';`,
        ``,
        `// https://astro.build/config`,
        `export default defineConfig({`,
        `  integrations: [`,
        `    cookieyes({`,
        `      mode: "cookie-only",`,
        `      regulation: "GDPR",`,
        `      colorScheme: "light",`,
        `      i18n: { messages: { es } },`,
        `    }),`,
        `  ],`,
        `});`,
        ``,
      ].join("\n"),
    );
    expect(read("src/layouts/Layout.astro")).toBe(
      STARTER_LAYOUT.replace(
        `---\n---\n`,
        `---\nimport { CookieYesRoot } from "@cookieyes/astro/components";\n---\n`,
      ).replace(`\t<body>\n`, `\t<body>\n\t\t<CookieYesRoot />\n`),
    );
    expect(existsSync(join(dir, "src", "cookieyes.client.ts"))).toBe(false);
    expect(installPackage).toHaveBeenCalledWith("@cookieyes/astro", "npm", dir);
    expect(installPackage).toHaveBeenCalledWith("@cookieyes/translations", "npm", dir);
    expect(manualSteps()).toHaveLength(0);
  });

  it("adds the integration beside the ones a site already has", async () => {
    write(
      "astro.config.ts",
      `import { defineConfig } from "astro/config";\nimport react from "@astrojs/react";\n\nexport default defineConfig({\n  site: "https://example.com",\n  integrations: [react()],\n});\n`,
    );
    write("src/layouts/BaseLayout.astro", `<html>\n  <body>\n    <slot />\n  </body>\n</html>\n`);

    await runInit(["--yes", "--no-install"]);

    expect(read("astro.config.ts")).toContain(
      `  integrations: [\n    react(),\n    cookieyes({\n      mode: "cookie-only",`,
    );
    expect(read("src/layouts/BaseLayout.astro")).toContain(
      `<body>\n    <CookieYesRoot />\n    <slot />`,
    );
    expect(manualSteps()).toHaveLength(0);
  });

  it("changes nothing on a second run", async () => {
    write("astro.config.mjs", STARTER_CONFIG);
    write("src/layouts/Layout.astro", STARTER_LAYOUT);
    await runInit(["--yes", "--no-install"]);
    const files = ["astro.config.mjs", "src/layouts/Layout.astro"].map(read);

    await runInit(["--yes", "--regulation=CCPA", "--no-install"]);

    expect(["astro.config.mjs", "src/layouts/Layout.astro"].map(read)).toEqual(files);
    expect(read("astro.config.mjs")).toContain(`regulation: "GDPR"`);
    expect(manualSteps()).toHaveLength(0);
  });

  it("prints the lines to add when the project has no layout or no config", async () => {
    write("src/pages/index.astro", `<html><body></body></html>\n`);

    await runInit(["--yes", "--no-install"]);

    const steps = manualSteps().map((c) => String(c[0]));
    expect(steps).toHaveLength(2);
    expect(steps[0]).toContain(`import cookieyes from "@cookieyes/astro";`);
    expect(steps[0]).toContain(`integrations: [cookieyes({`);
    expect(steps[1]).toContain(`import { CookieYesRoot } from "@cookieyes/astro/components";`);
    expect(existsSync(join(dir, "astro.config.mjs"))).toBe(false);
  });

  it("leaves a config it cannot patch safely untouched", async () => {
    const config = `import { defineConfig } from "astro/config";\nexport default defineConfig(shared);\n`;
    write("astro.config.mjs", config);
    write("src/layouts/Layout.astro", STARTER_LAYOUT);

    await runInit(["--yes", "--no-install"]);

    expect(read("astro.config.mjs")).toBe(config);
    expect(read("src/layouts/Layout.astro")).toContain("<CookieYesRoot />");
    expect(manualSteps()).toHaveLength(1);
  });
});
