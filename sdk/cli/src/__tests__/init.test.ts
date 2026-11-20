import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mock handles so the vi.mock factories can reference them.
const h = vi.hoisted(() => ({
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
  isCancel: vi.fn(() => false),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
  spinnerStart: vi.fn(),
  spinnerStop: vi.fn(),
  existsSync: vi.fn((_path?: unknown): boolean => false),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn((_path?: unknown): string => ""),
  detectFramework: vi.fn(() => null),
  detectPackageManager: vi.fn(() => "npm"),
  installPackage: vi.fn(),
  nextProjectPaths: vi.fn(),
  reactProjectPaths: vi.fn(),
  vueProjectPaths: vi.fn(),
  nuxtProjectPaths: vi.fn(),
  svelteProjectPaths: vi.fn(),
}));

vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: h.log,
  spinner: () => ({ start: h.spinnerStart, stop: h.spinnerStop }),
  isCancel: h.isCancel,
  select: h.select,
  text: h.text,
  multiselect: h.multiselect,
  confirm: h.confirm,
}));
vi.mock("node:fs", () => ({
  existsSync: h.existsSync,
  mkdirSync: h.mkdirSync,
  writeFileSync: h.writeFileSync,
  readFileSync: h.readFileSync,
}));
vi.mock("../utils/detect-framework.js", () => ({ detectFramework: h.detectFramework }));
vi.mock("../utils/detect-pm.js", () => ({ detectPackageManager: h.detectPackageManager }));
vi.mock("../utils/install.js", () => ({ installPackage: h.installPackage }));
vi.mock("../utils/detect-layout.js", () => ({
  nextProjectPaths: h.nextProjectPaths,
  reactProjectPaths: h.reactProjectPaths,
  vueProjectPaths: h.vueProjectPaths,
  nuxtProjectPaths: h.nuxtProjectPaths,
  svelteProjectPaths: h.svelteProjectPaths,
}));

import { cancel, note } from "@clack/prompts";
import { parseInitFlags, runInit } from "../commands/init.js";

const NEXT_PATHS = {
  providerPath: "/proj/src/components/consent-manager/provider.tsx",
  indexPath: "/proj/src/components/consent-manager/index.ts",
  appLayoutPath: "/proj/src/app/layout.tsx",
  pagesAppPath: "/proj/src/pages/_app.tsx",
  layout: "src" as const,
  router: "app" as const,
};
const REACT_PATHS = {
  providerPath: "/proj/src/components/consent-manager/provider.tsx",
  indexPath: "/proj/src/components/consent-manager/index.ts",
  layout: "src" as const,
  entryCandidates: [{ path: "/proj/src/main.tsx", label: "src/main.tsx" }],
};

const VUE_PATHS = {
  typescript: true,
  consentManagerPath: "/proj/src/consent-manager.ts",
  consentManagerLabel: "src/consent-manager.ts",
  rootPath: "/proj/src/components/CookieYesRoot.vue",
  entryPath: "/proj/src/main.ts",
  entryLabel: "src/main.ts",
  appPath: "/proj/src/App.vue",
};

const SVELTE_PATHS = {
  typescript: true,
  configPath: "/proj/src/lib/cookieyes.ts",
  configLabel: "src/lib/cookieyes.ts",
  rootPath: "/proj/src/lib/CookieYesRoot.svelte",
  entryPath: "/proj/src/main.ts",
  entryLabel: "src/main.ts",
  appPath: "/proj/src/App.svelte",
};

const NUXT_PATHS = {
  configPath: "/proj/nuxt.config.ts",
  configLabel: "nuxt.config.ts",
  appConfigPath: "/proj/app/app.config.ts",
  appConfigLabel: "app/app.config.ts",
  existingAppConfigLabel: null,
  appPath: "/proj/app/app.vue",
  appLabel: "app/app.vue",
};

/** All strings written to disk during a runInit() call. */
function writtenContents(): string[] {
  return h.writeFileSync.mock.calls.map((c) => String(c[1]));
}

beforeEach(() => {
  vi.clearAllMocks();
  h.isCancel.mockReturnValue(false);
  h.existsSync.mockReturnValue(false);
  h.readFileSync.mockReturnValue("");
  h.detectFramework.mockReturnValue(null);
  h.detectPackageManager.mockReturnValue("npm");
  h.installPackage.mockResolvedValue(undefined);
  h.nextProjectPaths.mockReturnValue(NEXT_PATHS);
  h.reactProjectPaths.mockReturnValue(REACT_PATHS);
  h.vueProjectPaths.mockReturnValue(VUE_PATHS);
  h.nuxtProjectPaths.mockReturnValue(NUXT_PATHS);
  h.svelteProjectPaths.mockReturnValue(SVELTE_PATHS);
  process.stdin.isTTY = true;
});

describe("runInit — Next.js (cookie-only, GDPR)", () => {
  it("scaffolds the consent-manager and installs the nextjs adapter", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("initCookieYes"))).toBe(true);
    expect(writes.some((w) => w.includes("<CookieBanner />"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/nextjs"'))).toBe(true);
    // Self-referential: the scaffold installs only @cookieyes/nextjs, and under
    // pnpm that app cannot resolve @cookieyes/react — so a scaffold pointing
    // there would not build for a pnpm user.
    expect(writes.some((w) => w.includes('import "@cookieyes/nextjs/styles.css"'))).toBe(true);
    expect(writes.some((w) => w.includes('import "@cookieyes/react/styles.css"'))).toBe(false);
    // App-router layout is generated when one does not already exist.
    expect(writes.some((w) => w.includes("RootLayout"))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nextjs", "npm", expect.any(String));
    // Every completed run ends with a star-repo nudge before the final outro.
    expect(note).toHaveBeenCalledWith(
      expect.stringContaining("github.com/cookieyes/cookieyes"),
      expect.any(String),
    );
  });
});

describe("runInit — React (self-hosted, CCPA, locales, skip install)", () => {
  it("emits apiUrl, opt-out component, locale imports and skips install", async () => {
    h.select
      .mockResolvedValueOnce("react")
      .mockResolvedValueOnce("self-hosted")
      .mockResolvedValueOnce("CCPA")
      .mockResolvedValueOnce("dark");
    h.text.mockResolvedValueOnce("https://api.example.com/consent");
    h.multiselect.mockResolvedValueOnce(["es", "fr"]);
    h.confirm.mockResolvedValueOnce(false);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes('apiUrl: "https://api.example.com/consent",'))).toBe(true);
    // A hand-written adapter is what lost failed records; the SDK's sender retries them.
    expect(writes.some((w) => w.includes("persist("))).toBe(false);
    expect(writes.some((w) => w.includes("initCookieYes({"))).toBe(true);
    expect(writes.some((w) => w.includes("<CookieOptOut />"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/es"'))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/react"'))).toBe(true);
    expect(writes.some((w) => w.includes('import "@cookieyes/react/styles.css"'))).toBe(true);
    // Install was declined.
    expect(h.installPackage).not.toHaveBeenCalled();
    // The star-repo nudge is emitted even when install is skipped (unconditional).
    expect(note).toHaveBeenCalledWith(
      expect.stringContaining("github.com/cookieyes/cookieyes"),
      expect.any(String),
    );
  });
});

const VUE_MAIN =
  "import { createApp } from 'vue'\nimport App from './App.vue'\n\ncreateApp(App).mount('#app')\n";
const VUE_APP =
  "<script setup lang=\"ts\">\nimport A from './A.vue'\n</script>\n\n<template>\n  <A />\n</template>\n";

/** The `src/...` files init wrote, by path. */
function writtenTo(path: string): string | undefined {
  const call = h.writeFileSync.mock.calls.find((c) => c[0] === path);
  return call === undefined ? undefined : String(call[1]);
}

function noteTexts(): string[] {
  return vi.mocked(note).mock.calls.map((c) => `${String(c[0])}|${String(c[1])}`);
}

describe("runInit: Vue (cookie-only, GDPR)", () => {
  it("scaffolds the consent setup and root component and installs the vue adapter", async () => {
    h.select
      .mockResolvedValueOnce("vue")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const setup = writtenTo(VUE_PATHS.consentManagerPath);
    expect(setup).toContain('import { CookieYes, type CookieYesConfig } from "@cookieyes/vue";');
    expect(setup).toContain('import "@cookieyes/vue/styles.css";');
    expect(setup).toContain('const config: CookieYesConfig = {\n  mode: "cookie-only",');
    expect(setup).toContain("export function setupConsent(app: App): void {");
    expect(setup).toContain("app.use(CookieYes, config);");
    const root = writtenTo(VUE_PATHS.rootPath);
    expect(root).toContain('<script setup lang="ts">');
    expect(root).toContain("<CookieBanner />\n  <CookiePreferences />\n  <RecallButton />");
    expect(root).not.toContain("CookieOptOut");
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/vue", "npm", expect.any(String));
  });

  it("writes plain JavaScript for a project whose entry is main.js", async () => {
    h.vueProjectPaths.mockReturnValue({
      ...VUE_PATHS,
      typescript: false,
      consentManagerPath: "/proj/src/consent-manager.js",
      consentManagerLabel: "src/consent-manager.js",
    });
    await runInit(["--framework=vue", "--yes", "--no-install"]);

    const setup = writtenTo("/proj/src/consent-manager.js");
    expect(setup).toContain('import { CookieYes } from "@cookieyes/vue";');
    expect(setup).toContain("const config = {");
    expect(setup).toContain("export function setupConsent(app) {");
    expect(setup).not.toContain("CookieYesConfig");
    expect(writtenTo(VUE_PATHS.rootPath)).toContain("<script setup>");
  });
});

describe("runInit: Vue (self-hosted, CCPA, locales)", () => {
  it("emits apiUrl, the opt-out component and locale imports", async () => {
    await runInit([
      "--framework=vue",
      "--api-url=https://api.example.com/consent",
      "--regulation=CCPA",
      "--color-scheme=dark",
      "--locales=es,fr",
      "--install",
    ]);

    const setup = writtenTo(VUE_PATHS.consentManagerPath);
    expect(setup).toContain('apiUrl: "https://api.example.com/consent",');
    expect(setup).toContain('regulation: "CCPA"');
    expect(setup).toContain('import { es } from "@cookieyes/translations/es";');
    expect(setup).toContain("i18n: { messages: { es, fr } },");
    expect(writtenTo(VUE_PATHS.rootPath)).toContain("<CookieOptOut />");
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/vue", "npm", expect.any(String));
    expect(h.installPackage).toHaveBeenCalledWith(
      "@cookieyes/translations",
      "npm",
      expect.any(String),
    );
  });
});

describe("runInit: Vue patching", () => {
  it("wires an existing main.ts and App.vue", async () => {
    h.existsSync.mockImplementation(
      (p: unknown) => String(p).endsWith("main.ts") || String(p).endsWith("App.vue"),
    );
    h.readFileSync.mockImplementation((p: unknown) =>
      String(p).endsWith("main.ts") ? VUE_MAIN : VUE_APP,
    );

    await runInit(["--framework=vue", "--yes", "--no-install"]);

    expect(writtenTo(VUE_PATHS.entryPath)).toContain("setupConsent(app)\napp.mount('#app')");
    expect(writtenTo(VUE_PATHS.appPath)).toContain("<template>\n  <CookieYesRoot />");
    expect(noteTexts().some((t) => t.endsWith("|Manual step needed"))).toBe(false);
  });

  it("prints manual steps and writes nothing when neither file can be patched", async () => {
    h.existsSync.mockImplementation(
      (p: unknown) => String(p).endsWith("main.ts") || String(p).endsWith("App.vue"),
    );
    h.readFileSync.mockImplementation((p: unknown) =>
      String(p).endsWith("main.ts") ? "start();\n" : "<template><div /></template>\n",
    );

    await runInit(["--framework=vue", "--yes", "--no-install"]);

    expect(writtenTo(VUE_PATHS.entryPath)).toBeUndefined();
    expect(writtenTo(VUE_PATHS.appPath)).toBeUndefined();
    const manual = noteTexts().filter((t) => t.endsWith("|Manual step needed"));
    expect(manual).toHaveLength(2);
    expect(manual[0]).toContain("setupConsent(app);");
    expect(manual[1]).toContain('import CookieYesRoot from "./components/CookieYesRoot.vue";');
  });

  it("prints manual steps when main.ts and App.vue do not exist", async () => {
    await runInit(["--framework=vue", "--yes", "--no-install"]);
    expect(noteTexts().filter((t) => t.endsWith("|Manual step needed"))).toHaveLength(2);
  });

  it("leaves everything alone when the project is already set up", async () => {
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockImplementation((p: unknown) =>
      String(p).endsWith("main.ts")
        ? "setupConsent(app)\n"
        : "<script setup>\nimport CookieYesRoot from './x.vue'\n</script>\n",
    );

    await runInit(["--framework=vue", "--yes", "--no-install"]);

    expect(h.writeFileSync).not.toHaveBeenCalled();
    expect(noteTexts().some((t) => t.endsWith("|Manual step needed"))).toBe(false);
    expect(h.log.info).toHaveBeenCalledWith(expect.stringContaining("already exists, skipped"));
    expect(h.log.info).toHaveBeenCalledWith(expect.stringContaining("already calls setupConsent"));
    expect(h.log.info).toHaveBeenCalledWith(expect.stringContaining("already uses CookieYesRoot"));
  });
});

const SVELTE_MAIN =
  "import { mount } from 'svelte'\nimport App from './App.svelte'\n\nexport default mount(App, { target: document.body })\n";
const SVELTE_APP = "<script lang=\"ts\">\n  import A from './A.svelte'\n</script>\n\n<A />\n";

describe("runInit: Svelte (cookie-only, GDPR)", () => {
  it("scaffolds the config and root component and installs the svelte adapter", async () => {
    h.select
      .mockResolvedValueOnce("svelte")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const config = writtenTo(SVELTE_PATHS.configPath);
    expect(config).toContain('import type { CookieYesConfig } from "@cookieyes/svelte";');
    expect(config).toContain('export const config: CookieYesConfig = {\n  mode: "cookie-only",');
    const root = writtenTo(SVELTE_PATHS.rootPath);
    expect(root).toContain('<script lang="ts">');
    expect(root).toContain('import { config } from "./cookieyes";');
    expect(root).toContain(
      "<CookieYesProvider {config}>\n  <CookieBanner />\n  <CookiePreferences />\n  <RecallButton />\n  {@render children?.()}\n</CookieYesProvider>",
    );
    expect(root).toContain("let { children }: { children?: Snippet } = $props();");
    expect(root).not.toContain("CookieOptOut");
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/svelte", "npm", expect.any(String));
  });

  it("writes plain JavaScript for a project whose entry is main.js", async () => {
    h.svelteProjectPaths.mockReturnValue({
      ...SVELTE_PATHS,
      typescript: false,
      configPath: "/proj/src/lib/cookieyes.js",
      configLabel: "src/lib/cookieyes.js",
    });
    await runInit(["--framework=svelte", "--yes", "--no-install"]);

    const config = writtenTo("/proj/src/lib/cookieyes.js");
    expect(config).toContain("export const config = {");
    expect(config).not.toContain("CookieYesConfig");
    const root = writtenTo(SVELTE_PATHS.rootPath);
    expect(root).toContain("<script>");
    expect(root).toContain("let { children } = $props();");
    expect(root).not.toContain("Snippet");
  });
});

describe("runInit: Svelte (self-hosted, CCPA, locales)", () => {
  it("emits apiUrl, the opt-out component and locale imports", async () => {
    await runInit([
      "--framework=svelte",
      "--api-url=https://api.example.com/consent",
      "--regulation=CCPA",
      "--locales=es,fr",
      "--install",
    ]);

    const config = writtenTo(SVELTE_PATHS.configPath);
    expect(config).toContain('apiUrl: "https://api.example.com/consent",');
    expect(config).toContain('import { es } from "@cookieyes/translations/es";');
    expect(config).toContain("i18n: { messages: { es, fr } },");
    expect(writtenTo(SVELTE_PATHS.rootPath)).toContain("<CookieOptOut />");
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/svelte", "npm", expect.any(String));
  });
});

describe("runInit: Svelte patching", () => {
  const entryAndApp = (p: unknown) =>
    String(p).endsWith("main.ts") || String(p).endsWith("App.svelte");

  it("wires an existing main.ts and App.svelte", async () => {
    h.existsSync.mockImplementation(entryAndApp);
    h.readFileSync.mockImplementation((p: unknown) =>
      String(p).endsWith("main.ts") ? SVELTE_MAIN : SVELTE_APP,
    );

    await runInit(["--framework=svelte", "--yes", "--no-install"]);

    expect(writtenTo(SVELTE_PATHS.entryPath)).toContain(
      "import App from './App.svelte'\nimport '@cookieyes/svelte/styles.css'",
    );
    expect(writtenTo(SVELTE_PATHS.appPath)).toContain("<A />\n\n<CookieYesRoot />");
    expect(noteTexts().some((t) => t.endsWith("|Manual step needed"))).toBe(false);
  });

  it("prints manual steps and writes nothing when neither file can be patched", async () => {
    h.existsSync.mockImplementation(entryAndApp);
    h.readFileSync.mockImplementation((p: unknown) =>
      String(p).endsWith("main.ts") ? "start();\n" : "<main />\n",
    );

    await runInit(["--framework=svelte", "--yes", "--no-install"]);

    expect(writtenTo(SVELTE_PATHS.entryPath)).toBeUndefined();
    expect(writtenTo(SVELTE_PATHS.appPath)).toBeUndefined();
    const manual = noteTexts().filter((t) => t.endsWith("|Manual step needed"));
    expect(manual).toHaveLength(2);
    expect(manual[0]).toContain('import "@cookieyes/svelte/styles.css";');
    expect(manual[1]).toContain('import CookieYesRoot from "./lib/CookieYesRoot.svelte";');
  });

  it("prints manual steps when main.ts and App.svelte do not exist", async () => {
    await runInit(["--framework=svelte", "--yes", "--no-install"]);
    expect(noteTexts().filter((t) => t.endsWith("|Manual step needed"))).toHaveLength(2);
  });

  it("leaves everything alone when the project is already set up", async () => {
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockImplementation((p: unknown) =>
      String(p).endsWith("main.ts")
        ? "import '@cookieyes/svelte/styles.css'\n"
        : "<script>\n  import CookieYesRoot from './x.svelte'\n</script>\n",
    );

    await runInit(["--framework=svelte", "--yes", "--no-install"]);

    expect(h.writeFileSync).not.toHaveBeenCalled();
    expect(noteTexts().some((t) => t.endsWith("|Manual step needed"))).toBe(false);
    expect(h.log.info).toHaveBeenCalledWith(expect.stringContaining("already exists, skipped"));
    expect(h.log.info).toHaveBeenCalledWith(
      expect.stringContaining("already imports the stylesheet"),
    );
    expect(h.log.info).toHaveBeenCalledWith(expect.stringContaining("already uses CookieYesRoot"));
  });
});

describe("runInit: Vue in a Nuxt project", () => {
  beforeEach(() => {
    h.detectFramework.mockReturnValue("nuxt" as never);
  });

  it("exits non-zero and writes nothing with --framework vue", async () => {
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`exit ${code}`);
    }) as never);
    await expect(runInit(["--framework=vue", "--yes"])).rejects.toThrow("exit 1");
    expect(cancel).toHaveBeenCalledWith(
      "--framework vue is not supported in a Nuxt project. Use --framework nuxt.",
    );
    expect(h.writeFileSync).not.toHaveBeenCalled();
    expect(h.installPackage).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("prints the manual step and writes nothing when Vue is picked at the prompt", async () => {
    h.select
      .mockResolvedValueOnce("vue")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    expect(h.writeFileSync).not.toHaveBeenCalled();
    expect(h.installPackage).not.toHaveBeenCalled();
    expect(noteTexts().some((t) => t.includes("pick Nuxt, or pass --framework nuxt"))).toBe(true);
  });
});

const NUXT_CONFIG = `export default defineNuxtConfig({\n  devtools: { enabled: true }\n})\n`;
const NUXT_APP = `<template>\n  <NuxtPage />\n</template>\n`;

describe("runInit: Nuxt", () => {
  it("offers Nuxt at the prompt, pre-selected when detected", async () => {
    h.detectFramework.mockReturnValue("nuxt" as never);
    h.select
      .mockResolvedValueOnce("nuxt")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const question = h.select.mock.calls[0]?.[0] as {
      initialValue: string;
      options: { value: string; hint?: string }[];
    };
    expect(question.initialValue).toBe("nuxt");
    expect(question.options.find((o) => o.value === "nuxt")?.hint).toBe("detected");
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nuxt", "npm", expect.any(String));
  });

  it("takes a detected Nuxt project with --yes and wires all three files", async () => {
    h.detectFramework.mockReturnValue("nuxt" as never);
    h.existsSync.mockImplementation(
      (p: unknown) => p === NUXT_PATHS.configPath || p === NUXT_PATHS.appPath,
    );
    h.readFileSync.mockImplementation((p: unknown) =>
      p === NUXT_PATHS.configPath ? NUXT_CONFIG : NUXT_APP,
    );

    await runInit(["--yes"]);

    expect(writtenTo(NUXT_PATHS.configPath)).toContain(`  modules: ["@cookieyes/nuxt"],\n`);
    expect(writtenTo(NUXT_PATHS.appConfigPath)).toBe(
      [
        `export default defineAppConfig({`,
        `  cookieyes: {`,
        `    mode: "cookie-only",`,
        `    regulation: "GDPR",`,
        `    colorScheme: "light",`,
        `  },`,
        `});`,
        ``,
      ].join("\n"),
    );
    expect(writtenTo(NUXT_PATHS.appPath)).toBe(
      `<template>\n  <CookieYesRoot />\n  <NuxtPage />\n</template>\n`,
    );
    expect(noteTexts().some((t) => t.endsWith("|Manual step needed"))).toBe(false);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nuxt", "npm", expect.any(String));
  });

  it("writes apiUrl and the locale imports into app.config", async () => {
    await runInit([
      "--framework=nuxt",
      "--api-url=https://api.example.com/consent",
      "--regulation=CCPA",
      "--color-scheme=dark",
      "--locales=es,fr",
      "--no-install",
    ]);

    const appConfig = writtenTo(NUXT_PATHS.appConfigPath);
    expect(appConfig).toMatch(
      /^import \{ es \} from "@cookieyes\/translations\/es";\nimport \{ fr \} from "@cookieyes\/translations\/fr";\n\nexport default defineAppConfig\(\{/,
    );
    expect(appConfig).toContain(
      `    mode: "self-hosted",\n    apiUrl: "https://api.example.com/consent",`,
    );
    expect(appConfig).toContain(`    regulation: "CCPA",\n    colorScheme: "dark",`);
    expect(appConfig).toContain(`    i18n: { messages: { es, fr } },\n  },\n});`);
    expect(h.installPackage).not.toHaveBeenCalled();
  });

  it("never overwrites an existing app config and prints the options to add", async () => {
    h.nuxtProjectPaths.mockReturnValue({
      ...NUXT_PATHS,
      existingAppConfigLabel: "app/app.config.ts",
    });
    await runInit(["--framework=nuxt", "--yes", "--no-install"]);

    expect(writtenTo(NUXT_PATHS.appConfigPath)).toBeUndefined();
    const manual = noteTexts().filter((t) => t.endsWith("|Manual step needed"));
    expect(manual.some((t) => t.includes("app/app.config.ts already exists"))).toBe(true);
    expect(manual.some((t) => t.includes(`cookieyes: {\n    mode: "cookie-only",`))).toBe(true);
  });

  it("prints manual steps when nuxt.config and app.vue are missing or cannot be patched", async () => {
    h.nuxtProjectPaths.mockReturnValue({ ...NUXT_PATHS, configPath: null });
    await runInit(["--framework=nuxt", "--yes", "--no-install"]);
    let manual = noteTexts().filter((t) => t.endsWith("|Manual step needed"));
    expect(manual).toHaveLength(2);
    expect(manual[0]).toContain(`modules: ["@cookieyes/nuxt"],`);
    expect(manual[1]).toContain("<CookieYesRoot />\n  <NuxtPage />");

    vi.clearAllMocks();
    h.nuxtProjectPaths.mockReturnValue(NUXT_PATHS);
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockImplementation((p: unknown) =>
      p === NUXT_PATHS.configPath
        ? "export default defineNuxtConfig(shared)\n"
        : "<script setup>\n</script>\n",
    );
    await runInit(["--framework=nuxt", "--yes", "--no-install"]);
    expect(writtenTo(NUXT_PATHS.configPath)).toBeUndefined();
    expect(writtenTo(NUXT_PATHS.appPath)).toBeUndefined();
    manual = noteTexts().filter((t) => t.endsWith("|Manual step needed"));
    expect(manual).toHaveLength(2);
  });

  it("leaves nuxt.config and app.vue alone when they are already set up", async () => {
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockImplementation((p: unknown) =>
      p === NUXT_PATHS.configPath
        ? `export default defineNuxtConfig({ modules: ["@cookieyes/nuxt"] })\n`
        : `<template>\n  <CookieYesRoot />\n</template>\n`,
    );

    await runInit(["--framework=nuxt", "--yes", "--no-install"]);

    expect(writtenTo(NUXT_PATHS.configPath)).toBeUndefined();
    expect(writtenTo(NUXT_PATHS.appPath)).toBeUndefined();
    expect(h.log.info).toHaveBeenCalledWith(
      expect.stringContaining("already lists @cookieyes/nuxt"),
    );
    expect(h.log.info).toHaveBeenCalledWith(expect.stringContaining("already uses CookieYesRoot"));
  });
});

describe("runInit — Vanilla (self-hosted, locales, install)", () => {
  it("writes the core runtime template and installs core + translations", async () => {
    h.select
      .mockResolvedValueOnce("vanilla")
      .mockResolvedValueOnce("self-hosted")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.text.mockResolvedValueOnce("/api/consent");
    h.multiselect.mockResolvedValueOnce(["de"]);
    h.confirm.mockResolvedValueOnce(true);

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("getOrCreateConsentRuntime"))).toBe(true);
    // Regulation is a top-level key now — the deprecated `overrides` wrapper is gone.
    expect(writes.some((w) => w.includes('regulation: "GDPR"'))).toBe(true);
    expect(writes.every((w) => !w.includes("overrides"))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/de"'))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/core", "npm", expect.any(String));
    expect(h.installPackage).toHaveBeenCalledWith(
      "@cookieyes/translations",
      "npm",
      expect.any(String),
    );
  });
});

describe("runInit — patching existing files", () => {
  it("patches an existing Next.js app-router layout", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    // Everything already exists; the layout has a {children} slot to patch.
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockReturnValue("<html><body>{children}</body></html>");

    await runInit();

    const writes = writtenContents();
    expect(writes.some((w) => w.includes("CookieYesRoot"))).toBe(true);
    expect(h.log.info).toHaveBeenCalled(); // "already exists — skipped" for provider/index
  });

  it("patches an existing Pages-router _app", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.nextProjectPaths.mockReturnValue({ ...NEXT_PATHS, router: "pages" });
    h.existsSync.mockImplementation((p: unknown) => String(p).endsWith("_app.tsx"));
    h.readFileSync.mockReturnValue(
      "export default function App({ Component, pageProps }) { return <Component {...pageProps} />; }",
    );

    await runInit();

    expect(writtenContents().some((w) => w.includes("CookieYesRoot"))).toBe(true);
  });

  it("patches an existing React entry and warns when install fails", async () => {
    h.select
      .mockResolvedValueOnce("react")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.existsSync.mockImplementation((p: unknown) => String(p).endsWith("main.tsx"));
    h.readFileSync.mockReturnValue("import App from './App';\nroot.render(<App />);");
    h.installPackage.mockRejectedValueOnce(new Error("network down"));

    await runInit();

    expect(writtenContents().some((w) => w.includes("CookieYesRoot"))).toBe(true);
    expect(h.log.warn).toHaveBeenCalled();
  });

  it("prints a manual step when a Pages-router _app does not exist", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.nextProjectPaths.mockReturnValue({ ...NEXT_PATHS, router: "pages" });
    h.existsSync.mockReturnValue(false); // nothing exists → _app gets a manual-step note

    await runInit();

    // provider + index are still scaffolded
    expect(writtenContents().some((w) => w.includes("initCookieYes"))).toBe(true);
  });

  it("skips patching when the layout already uses CookieYesRoot", async () => {
    h.select
      .mockResolvedValueOnce("nextjs")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.existsSync.mockReturnValue(true);
    h.readFileSync.mockReturnValue(
      'import { CookieYesRoot } from "@/components/consent-manager";\n<body>{children}<CookieYesRoot /></body>',
    );

    await runInit();

    expect(h.log.info).toHaveBeenCalled(); // "already uses CookieYesRoot — skipped"
  });

  it("warns when the translations install fails", async () => {
    h.select
      .mockResolvedValueOnce("vanilla")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce(["de"]);
    h.confirm.mockResolvedValueOnce(true);
    // Core install succeeds, translations install rejects.
    h.installPackage.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("boom"));

    await runInit();

    expect(h.log.warn).toHaveBeenCalled();
  });

  it("skips the React provider/index when they already exist", async () => {
    h.select
      .mockResolvedValueOnce("react")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(true);
    h.existsSync.mockReturnValue(true); // provider + index + entry already present
    h.readFileSync.mockReturnValue("import App from './App';\nroot.render(<App />);");

    await runInit();

    expect(h.log.info).toHaveBeenCalled(); // skipped messages
  });

  it("skips the vanilla consent file when it already exists", async () => {
    h.select
      .mockResolvedValueOnce("vanilla")
      .mockResolvedValueOnce("cookie-only")
      .mockResolvedValueOnce("GDPR")
      .mockResolvedValueOnce("light");
    h.multiselect.mockResolvedValueOnce([]);
    h.confirm.mockResolvedValueOnce(false);
    h.existsSync.mockReturnValue(true); // src/ and consent.ts already exist

    await runInit();

    expect(h.log.info).toHaveBeenCalled();
  });
});

describe("parseInitFlags", () => {
  it("reads every flag, with a space or an = before the value", () => {
    expect(
      parseInitFlags([
        "--framework=react",
        "--mode",
        "self-hosted",
        "--api-url",
        "/api/consent",
        "--regulation=ccpa",
        "--color-scheme",
        "dark",
        "--locales",
        "es, fr",
        "--no-install",
        "-y",
      ]),
    ).toEqual({
      framework: "react",
      mode: "self-hosted",
      apiUrl: "/api/consent",
      regulation: "CCPA",
      colorScheme: "dark",
      locales: ["es", "fr"],
      install: false,
      yes: true,
    });
  });

  it("treats an API URL as a self-hosted setup", () => {
    expect(parseInitFlags(["--api-url=https://api.example.com/consent"]).mode).toBe("self-hosted");
  });

  it("accepts vue as a framework", () => {
    expect(parseInitFlags(["--framework", "vue"]).framework).toBe("vue");
  });

  it("accepts svelte as a framework", () => {
    expect(parseInitFlags(["--framework", "svelte"]).framework).toBe("svelte");
  });

  it("accepts nuxt as a framework", () => {
    expect(parseInitFlags(["--framework=Nuxt"]).framework).toBe("nuxt");
  });

  it("reads an empty --locales as no extra languages", () => {
    expect(parseInitFlags(["--locales="]).locales).toEqual([]);
  });

  it("refuses a typo instead of ignoring it", () => {
    expect(() => parseInitFlags(["--framwork", "react"])).toThrow(/Unknown option/);
    expect(() => parseInitFlags(["--framework", "angular"])).toThrow(/must be one of/);
    expect(() => parseInitFlags(["--locales", "es,xx"])).toThrow(/must be one of/);
    expect(() => parseInitFlags(["--api-url", "not a url"])).toThrow(/--api-url/);
    expect(() => parseInitFlags(["--mode"])).toThrow(/needs a value/);
    expect(() => parseInitFlags(["--mode", "--yes"])).toThrow(/needs a value/);
  });

  it("refuses an API URL with a cookie-only setup", () => {
    expect(() => parseInitFlags(["--mode=cookie-only", "--api-url=/api/consent"])).toThrow(
      /needs --mode self-hosted/,
    );
  });
});

describe("runInit — flags", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const exit = () =>
    vi.spyOn(process, "exit").mockImplementation(((code: number) => {
      throw new Error(`exit ${code}`);
    }) as never);

  it("asks nothing when every answer is a flag", async () => {
    await runInit([
      "--framework=react",
      "--api-url=https://api.example.com/consent",
      "--regulation=CCPA",
      "--color-scheme=dark",
      "--locales=es",
      "--no-install",
    ]);
    for (const prompt of [h.select, h.text, h.multiselect, h.confirm]) {
      expect(prompt).not.toHaveBeenCalled();
    }
    const writes = writtenContents();
    expect(writes.some((w) => w.includes('apiUrl: "https://api.example.com/consent",'))).toBe(true);
    expect(writes.some((w) => w.includes('regulation: "CCPA"'))).toBe(true);
    expect(writes.some((w) => w.includes('from "@cookieyes/translations/es"'))).toBe(true);
    expect(h.installPackage).not.toHaveBeenCalled();
  });

  it("takes the defaults with --yes", async () => {
    h.detectFramework.mockReturnValue("nextjs" as never);
    await runInit(["--yes"]);
    for (const prompt of [h.select, h.text, h.multiselect, h.confirm]) {
      expect(prompt).not.toHaveBeenCalled();
    }
    const writes = writtenContents();
    expect(writes.some((w) => w.includes('mode: "cookie-only"'))).toBe(true);
    expect(writes.some((w) => w.includes('regulation: "GDPR"'))).toBe(true);
    expect(h.installPackage).toHaveBeenCalledWith("@cookieyes/nextjs", "npm", expect.any(String));
  });

  it("asks only the questions no flag answered", async () => {
    h.multiselect.mockResolvedValueOnce([]);
    await runInit([
      "--framework=vanilla",
      "--mode=cookie-only",
      "--regulation=GDPR",
      "--color-scheme=light",
      "--install",
    ]);
    expect(h.select).not.toHaveBeenCalled();
    expect(h.multiselect).toHaveBeenCalledTimes(1);
    expect(h.confirm).not.toHaveBeenCalled();
  });

  it("fails instead of waiting when there is no terminal to ask in", async () => {
    process.stdin.isTTY = false as never;
    exit();
    await expect(runInit(["--framework=react"])).rejects.toThrow("exit 1");
    expect(h.select).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith(expect.stringContaining("--mode"));
    expect(h.writeFileSync).not.toHaveBeenCalled();
  });

  it("does not guess a backend URL for --yes with a self-hosted setup", async () => {
    exit();
    await expect(runInit(["--yes", "--mode=self-hosted"])).rejects.toThrow("exit 1");
    expect(cancel).toHaveBeenCalledWith("--mode self-hosted needs --api-url.");
    expect(h.writeFileSync).not.toHaveBeenCalled();
  });

  it("stops on a bad flag before asking anything", async () => {
    exit();
    await expect(runInit(["--regulation=LGPD"])).rejects.toThrow("exit 1");
    expect(h.select).not.toHaveBeenCalled();
  });
});
