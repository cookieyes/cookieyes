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

beforeEach(() => {
  vi.clearAllMocks();
  dir = mkdtempSync(join(tmpdir(), "cy-nuxt-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  write("package.json", JSON.stringify({ dependencies: { nuxt: "^4.0.0", vue: "^3.5.0" } }));
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

describe("runInit in a Nuxt project", () => {
  it("sets up a Nuxt 4 starter: module, app config and root component", async () => {
    write(
      "nuxt.config.ts",
      [
        `// https://nuxt.com/docs/api/configuration/nuxt-config`,
        `export default defineNuxtConfig({`,
        `  compatibilityDate: '2025-07-15',`,
        `  devtools: { enabled: true }`,
        `})`,
        ``,
      ].join("\n"),
    );
    write(
      "app/app.vue",
      `<template>\n  <div>\n    <NuxtRouteAnnouncer />\n    <NuxtWelcome />\n  </div>\n</template>\n`,
    );

    await runInit(["--yes", "--locales=es"]);

    expect(read("nuxt.config.ts")).toBe(
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
    expect(read("app/app.config.ts")).toBe(
      [
        `import { es } from "@cookieyes/translations/es";`,
        ``,
        `export default defineAppConfig({`,
        `  cookieyes: {`,
        `    mode: "cookie-only",`,
        `    regulation: "GDPR",`,
        `    colorScheme: "light",`,
        `    i18n: { messages: { es } },`,
        `  },`,
        `});`,
        ``,
      ].join("\n"),
    );
    expect(read("app/app.vue")).toBe(
      `<template>\n  <CookieYesRoot />\n  <div>\n    <NuxtRouteAnnouncer />\n    <NuxtWelcome />\n  </div>\n</template>\n`,
    );
    expect(installPackage).toHaveBeenCalledWith("@cookieyes/nuxt", "npm", dir);
    expect(installPackage).toHaveBeenCalledWith("@cookieyes/translations", "npm", dir);
    expect(vi.mocked(note).mock.calls.some((c) => c[1] === "Manual step needed")).toBe(false);
  });

  it("changes nothing on a second run", async () => {
    write("nuxt.config.ts", `export default defineNuxtConfig({})\n`);
    write("app/app.vue", `<template>\n  <NuxtPage />\n</template>\n`);
    await runInit(["--yes", "--no-install"]);
    const files = ["nuxt.config.ts", "app/app.config.ts", "app/app.vue"].map(read);

    await runInit(["--yes", "--regulation=CCPA", "--no-install"]);

    expect(["nuxt.config.ts", "app/app.config.ts", "app/app.vue"].map(read)).toEqual(files);
    expect(read("app/app.config.ts")).toContain(`regulation: "GDPR"`);
  });

  it("writes app.config.js at the root of a JavaScript project without an app/ directory", async () => {
    write("nuxt.config.js", `export default defineNuxtConfig({\n  modules: ['@nuxt/ui'],\n})\n`);
    write("app.vue", `<template>\n  <NuxtPage />\n</template>\n`);

    await runInit(["--yes", "--no-install"]);

    expect(read("nuxt.config.js")).toContain(`modules: ['@nuxt/ui', '@cookieyes/nuxt'],`);
    expect(read("app.config.js")).toContain(`export default defineAppConfig({`);
    expect(existsSync(join(dir, "app", "app.config.ts"))).toBe(false);
    expect(read("app.vue")).toContain(`<template>\n  <CookieYesRoot />\n  <NuxtPage />`);
  });
});
