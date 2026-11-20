import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  log,
  multiselect,
  note,
  outro,
  select,
  spinner,
  text,
} from "@clack/prompts";
import pc from "picocolors";
import { detectFramework, type Framework } from "../utils/detect-framework.js";
import {
  nextProjectPaths,
  nuxtProjectPaths,
  reactProjectPaths,
  svelteProjectPaths,
  vueProjectPaths,
} from "../utils/detect-layout.js";
import { detectPackageManager, type PackageManager } from "../utils/detect-pm.js";
import { installPackage } from "../utils/install.js";
import {
  insertImport,
  patchNextjsLayout,
  patchNextjsPagesApp,
  patchNuxtApp,
  patchNuxtConfig,
  patchSvelteApp,
  patchSvelteMain,
  patchVueApp,
  patchVueMain,
} from "../utils/patchers.js";

// ─── Option builders ──────────────────────────────────────────────────────────

type Locale = "es" | "fr" | "de";

type OptionInputs = {
  mode: "self-hosted" | "cookie-only";
  regulation: "GDPR" | "CCPA";
  colorScheme: "light" | "dark";
  backendURL?: string | undefined;
  locales: Locale[];
};

/**
 * Emit the canonical `CookieYesConfig` object literal. `indent` is the
 * indentation of the enclosing statement (the closing brace lands there); the
 * object's own keys sit one level (2 spaces) deeper.
 */
function buildConfigLiteral(opts: OptionInputs, indent: string): string {
  const inner = `${indent}  `;
  const lines: string[] = ["{"];
  lines.push(`${inner}mode: "${opts.mode}",`);

  // `apiUrl`, not a hand-written `backend.persist`: the one this emitted never
  // threw on a non-2xx response, so the SDK took every failed record as stored
  // and never retried it. The SDK's own sender checks the status and retries.
  if (opts.mode === "self-hosted" && opts.backendURL) {
    lines.push(`${inner}apiUrl: ${JSON.stringify(opts.backendURL)},`);
  }

  lines.push(`${inner}regulation: "${opts.regulation}",`);
  lines.push(`${inner}colorScheme: "${opts.colorScheme}",`);

  if (opts.locales.length > 0) {
    lines.push(`${inner}i18n: { messages: { ${opts.locales.join(", ")} } },`);
  }

  lines.push(`${indent}}`);
  return lines.join("\n");
}

function localeImportLines(opts: OptionInputs): string[] {
  if (opts.locales.length === 0) return [];
  const lines: string[] = [];
  for (const lang of opts.locales) {
    lines.push(`import { ${lang} } from "@cookieyes/translations/${lang}";`);
  }
  return lines;
}

// ─── File templates ───────────────────────────────────────────────────────────

function nextjsProviderTemplate(opts: OptionInputs, isCCPA: boolean): string {
  const ccpaImport = isCCPA ? `\n  CookieOptOut,` : "";
  const ccpaComponent = isCCPA ? `\n      <CookieOptOut />` : "";
  const localeImports = localeImportLines(opts);

  return [
    `"use client";`,
    ``,
    ...localeImports,
    `import {`,
    `  CookieBanner,${ccpaImport}`,
    `  CookiePreferences,`,
    `  RecallButton,`,
    `  initCookieYes,`,
    `} from "@cookieyes/nextjs";`,
    // Self-referential, not "@cookieyes/react/styles.css": under pnpm's strict
    // node_modules layout an app that installed only @cookieyes/nextjs cannot
    // resolve the react package, and the scaffold would not build.
    `import "@cookieyes/nextjs/styles.css";`,
    ``,
    `initCookieYes(${buildConfigLiteral(opts, "")});`,
    ``,
    `export function CookieYesRoot() {`,
    `  return (`,
    `    <>`,
    `      <CookieBanner />`,
    `      <CookiePreferences />${ccpaComponent}`,
    `      <RecallButton />`,
    `    </>`,
    `  );`,
    `}`,
  ].join("\n");
}

function indexTemplate(): string {
  return `export { CookieYesRoot } from "./provider";\n`;
}

function nextjsLayoutTemplate(): string {
  return [
    `import type { ReactNode } from "react";`,
    `import { CookieYesRoot } from "@/components/consent-manager";`,
    ``,
    `// Returning visitors: by default the server can't tell whether someone has`,
    `// already chosen, so the banner is rendered for everyone and removed after`,
    `// hydration — which they see as it appearing and then vanishing. To read their`,
    `// stored decision here (a Server Component) and skip rendering the banner for`,
    `// them entirely, see "Returning visitors" in the @cookieyes/nextjs README:`,
    `// https://github.com/cookieyes/cookieyes/tree/main/sdk/nextjs#returning-visitors--no-banner-flash`,
    ``,
    `export const metadata = { title: "My App" };`,
    ``,
    `export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {`,
    `  return (`,
    `    <html lang="en">`,
    `      <body>`,
    `        {children}`,
    `        <CookieYesRoot />`,
    `      </body>`,
    `    </html>`,
    `  );`,
    `}`,
  ].join("\n");
}

function reactProviderTemplate(opts: OptionInputs, isCCPA: boolean): string {
  const ccpaImport = isCCPA ? `\n  CookieOptOut,` : "";
  const ccpaComponent = isCCPA ? `\n      <CookieOptOut />` : "";
  const localeImports = localeImportLines(opts);

  return [
    `"use client";`,
    ``,
    ...localeImports,
    `import {`,
    `  CookieBanner,${ccpaImport}`,
    `  CookiePreferences,`,
    `  RecallButton,`,
    `  initCookieYes,`,
    `} from "@cookieyes/react";`,
    `import "@cookieyes/react/styles.css";`,
    ``,
    `initCookieYes(${buildConfigLiteral(opts, "")});`,
    ``,
    `export function CookieYesRoot() {`,
    `  return (`,
    `    <>`,
    `      <CookieBanner />`,
    `      <CookiePreferences />${ccpaComponent}`,
    `      <RecallButton />`,
    `    </>`,
    `  );`,
    `}`,
  ].join("\n");
}

function vueConsentManagerTemplate(opts: OptionInputs, typescript: boolean): string {
  return [
    ...(typescript
      ? [
          `import type { App } from "vue";`,
          `import { CookieYes, type CookieYesConfig } from "@cookieyes/vue";`,
        ]
      : [`import { CookieYes } from "@cookieyes/vue";`]),
    `import "@cookieyes/vue/styles.css";`,
    ...localeImportLines(opts),
    ``,
    `const config${typescript ? ": CookieYesConfig" : ""} = ${buildConfigLiteral(opts, "")};`,
    ``,
    `export function setupConsent(app${typescript ? ": App): void" : ")"} {`,
    `  app.use(CookieYes, config);`,
    `}`,
    ``,
  ].join("\n");
}

function vueRootTemplate(typescript: boolean, isCCPA: boolean): string {
  return [
    `<script setup${typescript ? ' lang="ts"' : ""}>`,
    `import {`,
    `  CookieBanner,${isCCPA ? "\n  CookieOptOut," : ""}`,
    `  CookiePreferences,`,
    `  RecallButton,`,
    `} from "@cookieyes/vue";`,
    `</script>`,
    ``,
    `<template>`,
    `  <CookieBanner />`,
    `  <CookiePreferences />${isCCPA ? "\n  <CookieOptOut />" : ""}`,
    `  <RecallButton />`,
    `</template>`,
    ``,
  ].join("\n");
}

function svelteConfigTemplate(opts: OptionInputs, typescript: boolean): string {
  return [
    ...(typescript ? [`import type { CookieYesConfig } from "@cookieyes/svelte";`] : []),
    ...localeImportLines(opts),
    ``,
    `export const config${typescript ? ": CookieYesConfig" : ""} = ${buildConfigLiteral(opts, "")};`,
    ``,
  ].join("\n");
}

/**
 * The root renders `children` inside the provider: Svelte's hooks read the provider's context, so
 * a component outside it that calls one throws. Wrapping the app in the root avoids that.
 */
function svelteRootTemplate(typescript: boolean, isCCPA: boolean): string {
  return [
    `<script${typescript ? ' lang="ts"' : ""}>`,
    ...(typescript ? [`  import type { Snippet } from "svelte";`] : []),
    `  import {`,
    `    CookieBanner,${isCCPA ? "\n    CookieOptOut," : ""}`,
    `    CookiePreferences,`,
    `    CookieYesProvider,`,
    `    RecallButton,`,
    `  } from "@cookieyes/svelte";`,
    `  import { config } from "./cookieyes";`,
    ``,
    typescript
      ? `  let { children }: { children?: Snippet } = $props();`
      : `  let { children } = $props();`,
    `</script>`,
    ``,
    `<CookieYesProvider {config}>`,
    `  <CookieBanner />`,
    `  <CookiePreferences />${isCCPA ? "\n  <CookieOptOut />" : ""}`,
    `  <RecallButton />`,
    `  {@render children?.()}`,
    `</CookieYesProvider>`,
    ``,
  ].join("\n");
}

/**
 * The options go in `app.config.ts`, not under `cookieyes` in `nuxt.config.ts`: that key becomes
 * runtime config, which is JSON, so integrations and callbacks added there later would be dropped.
 */
function nuxtAppConfigTemplate(opts: OptionInputs): string {
  const imports = localeImportLines(opts);
  return [
    ...imports,
    ...(imports.length > 0 ? [``] : []),
    `export default defineAppConfig({`,
    `  cookieyes: ${buildConfigLiteral(opts, "  ")},`,
    `});`,
    ``,
  ].join("\n");
}

function vanillaTemplate(opts: OptionInputs): string {
  const coreImport = `import { getOrCreateConsentRuntime } from "@cookieyes/core";`;
  const localeImports = localeImportLines(opts);

  return [
    coreImport,
    ...localeImports,
    ``,
    `// Create (or retrieve) the singleton consent runtime.`,
    `export const { consentManager, consentStore } = getOrCreateConsentRuntime(${buildConfigLiteral(opts, "")});`,
    ``,
    `// ─── React to state changes ───────────────────────────────────────`,
    ``,
    `consentStore.subscribe((state) => {`,
    `  if (state.has("analytics")) {`,
    `    // Load analytics scripts (gtag, Mixpanel, etc.)`,
    `  }`,
    `  if (state.has("advertisement")) {`,
    `    // Load ad scripts (Meta Pixel, Google Ads, etc.)`,
    `  }`,
    `});`,
    ``,
    `// React only to saved preference changes (not UI toggle events):`,
    `consentStore`,
    `  .getState()`,
    `  .subscribeToConsentChanges(({ allowedCategories, deniedCategories }) => {`,
    `    console.log("Allowed:", allowedCategories);`,
    `    console.log("Denied:", deniedCategories);`,
    `  });`,
    ``,
    `// ─── Imperative API ───────────────────────────────────────────────`,
    ``,
    `// consentStore.getState().has("analytics")        — check a category`,
    `// consentStore.getState().saveConsents("all")     — accept all`,
    `// consentStore.getState().saveConsents("necessary") — reject all`,
    `// consentStore.getState().setConsent("analytics", true) — toggle one`,
    `// consentManager.showPreferences()                — open dialog`,
    `// consentManager.resetConsent()                   — clear + re-prompt`,
  ].join("\n");
}

/**
 * Patch a React entry file (main.tsx / index.tsx) to render <CookieYesRoot/> alongside <App/>.
 */
function patchReactEntry(
  candidates: ReadonlyArray<{ path: string; label: string }>,
): string | null {
  const entry = candidates.find((c) => existsSync(c.path));
  if (!entry) return null;

  let src = readFileSync(entry.path, "utf-8");

  if (src.includes("CookieYesRoot") && src.includes("consent-manager")) return null;

  src = insertImport(src, `import { CookieYesRoot } from "./components/consent-manager";`);

  const appPattern = /(<App\s*\/>)/g;
  if (!appPattern.test(src)) return null;

  src = src.replace(/(<App\s*\/>)/g, `<>\n      $1\n      <CookieYesRoot />\n    </>`);
  writeFileSync(entry.path, src, "utf-8");
  return entry.label;
}

/** Result of adding a setup line to an existing file. */
type FilePatch = "patched" | "already" | "manual" | "missing";

function patchFile(path: string, patch: (src: string) => string | null, done: RegExp): FilePatch {
  if (!existsSync(path)) return "missing";
  const src = readFileSync(path, "utf-8");
  const patched = patch(src);
  if (patched) {
    writeFileSync(path, patched, "utf-8");
    return "patched";
  }
  return done.test(src) ? "already" : "manual";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function writeFile(path: string, content: string, label: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
  log.success(`Created ${pc.cyan(label)}`);
}

function pkgForFramework(framework: Framework): string {
  if (framework === "nextjs") return "@cookieyes/nextjs";
  if (framework === "react") return "@cookieyes/react";
  if (framework === "vue") return "@cookieyes/vue";
  if (framework === "nuxt") return "@cookieyes/nuxt";
  if (framework === "svelte") return "@cookieyes/svelte";
  return "@cookieyes/core";
}

function installHint(pm: PackageManager, pkg: string): string {
  switch (pm) {
    case "pnpm":
      return `pnpm add ${pkg}`;
    case "yarn":
      return `yarn add ${pkg}`;
    case "bun":
      return `bun add ${pkg}`;
    default:
      return `npm install ${pkg}`;
  }
}

function urlProblem(value: string): string | undefined {
  const v = value.trim();
  const message = "Enter a valid URL or path (e.g. /api/consent)";
  if (v.length === 0) return message;
  if (v.startsWith("/")) return undefined; // allow relative paths
  try {
    new URL(v);
    return undefined;
  } catch {
    return message;
  }
}

// ─── Flags ────────────────────────────────────────────────────────────────────

/** Answers given on the command line. A prompt whose answer is here is skipped. */
export type InitFlags = {
  framework?: Framework | undefined;
  mode?: OptionInputs["mode"] | undefined;
  apiUrl?: string | undefined;
  regulation?: OptionInputs["regulation"] | undefined;
  colorScheme?: OptionInputs["colorScheme"] | undefined;
  locales?: Locale[] | undefined;
  install?: boolean | undefined;
  /** Take the default for every prompt not answered by another flag. */
  yes?: boolean | undefined;
};

function oneOf<T extends string>(flag: string, value: string, allowed: readonly T[]): T {
  const match = allowed.find((a) => a.toLowerCase() === value.toLowerCase());
  if (!match) throw new Error(`${flag} must be one of ${allowed.join(", ")}, not "${value}".`);
  return match;
}

/**
 * Reads the `init` flags. Values go after a space or an `=`. Throws on an unknown flag or
 * value, so a typo fails loudly instead of being asked about or silently defaulted.
 */
export function parseInitFlags(args: readonly string[]): InitFlags {
  const flags: InitFlags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i] as string;
    const eq = arg.indexOf("=");
    const name = eq === -1 ? arg : arg.slice(0, eq);
    const value = (): string => {
      if (eq !== -1) return arg.slice(eq + 1);
      const next = args[i + 1];
      if (next === undefined || next.startsWith("--")) throw new Error(`${name} needs a value.`);
      i++;
      return next;
    };
    switch (name) {
      case "--yes":
      case "-y":
        flags.yes = true;
        break;
      case "--install":
        flags.install = true;
        break;
      case "--no-install":
        flags.install = false;
        break;
      case "--framework":
        flags.framework = oneOf(name, value(), [
          "nextjs",
          "react",
          "vue",
          "nuxt",
          "svelte",
          "vanilla",
        ] as const);
        break;
      case "--mode":
        flags.mode = oneOf(name, value(), ["cookie-only", "self-hosted"] as const);
        break;
      case "--api-url": {
        const url = value().trim();
        const problem = urlProblem(url);
        if (problem) throw new Error(`--api-url: ${problem}.`);
        flags.apiUrl = url;
        break;
      }
      case "--regulation":
        flags.regulation = oneOf(name, value(), ["GDPR", "CCPA"] as const);
        break;
      case "--color-scheme":
        flags.colorScheme = oneOf(name, value(), ["light", "dark"] as const);
        break;
      case "--locales": {
        const list = value()
          .split(",")
          .map((l) => l.trim())
          .filter(Boolean);
        flags.locales = list.map((l) => oneOf(name, l, ["es", "fr", "de"] as const));
        break;
      }
      default:
        throw new Error(`Unknown option for init: ${arg}`);
    }
  }
  // An API URL only means something for a self-hosted setup, so it implies one.
  if (flags.apiUrl !== undefined) {
    if (flags.mode === "cookie-only") throw new Error("--api-url needs --mode self-hosted.");
    flags.mode = "self-hosted";
  }
  return flags;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runInit(args: readonly string[] = []): Promise<void> {
  const cwd = process.cwd();

  let flags: InitFlags;
  try {
    flags = parseInitFlags(args);
  } catch (error) {
    cancel(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  // Without a terminal a prompt waits for input that never comes, so a script or CI job
  // hung instead of failing. Every answer must then come from a flag or from --yes.
  const ask = <T>(flag: string, prompt: () => Promise<T | symbol>): Promise<T | symbol> => {
    if (!process.stdin.isTTY) {
      cancel(`No terminal to ask in. Pass ${flag}, or --yes to accept the defaults.`);
      process.exit(1);
    }
    return prompt();
  };

  console.log();
  intro(pc.bgBlue(pc.bold(pc.white("  CookieYes  "))));

  const detected = detectFramework(cwd);
  const nuxt = detected === "nuxt";
  const pm = detectPackageManager(cwd);

  // ── Framework ──────────────────────────────────────────────────────────────
  const frameworkAnswer =
    flags.framework ??
    (flags.yes
      ? (detected ?? "nextjs")
      : await ask("--framework", () =>
          select({
            message: "Which framework are you using?",
            options: [
              {
                value: "nextjs" as const,
                label: "Next.js",
                ...(detected === "nextjs" ? { hint: "detected" } : {}),
              },
              {
                value: "react" as const,
                label: "React",
                hint: detected === "react" ? "detected" : "Vite, CRA, etc.",
              },
              {
                value: "vue" as const,
                label: "Vue",
                hint: detected === "vue" ? "detected" : "Vite, create-vue, etc.",
              },
              {
                value: "nuxt" as const,
                label: "Nuxt",
                hint: nuxt ? "detected" : "Nuxt 4",
              },
              {
                value: "svelte" as const,
                label: "Svelte",
                hint: detected === "svelte" ? "detected" : "Vite + Svelte 5",
              },
              { value: "vanilla" as const, label: "Vanilla JS / Other" },
            ],
            initialValue: detected ?? ("nextjs" as const),
          }),
        ));

  if (isCancel(frameworkAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const framework = frameworkAnswer as Framework;

  // Nuxt has no `src/main.ts` or `App.vue` to patch; writing them anyway would leave dead
  // files next to a banner that never renders.
  if (framework === "vue" && nuxt && flags.framework === "vue") {
    cancel("--framework vue is not supported in a Nuxt project. Use --framework nuxt.");
    process.exit(1);
  }

  // ── Mode ───────────────────────────────────────────────────────────────────
  const modeAnswer =
    flags.mode ??
    (flags.yes
      ? "cookie-only"
      : await ask("--mode", () =>
          select({
            message: "Backend mode?",
            options: [
              {
                value: "cookie-only" as const,
                label: "Cookie-only",
                hint: "no backend — stored in a browser cookie",
              },
              {
                value: "self-hosted" as const,
                label: "Self-hosted",
                hint: "sync consent to your backend",
              },
            ],
            initialValue: "cookie-only" as const,
          }),
        ));

  if (isCancel(modeAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const mode = modeAnswer as "cookie-only" | "self-hosted";

  // ── Backend URL (only when self-hosted) ────────────────────────────────────
  let backendURL: string | undefined;
  if (mode === "self-hosted") {
    // No default: a guessed URL would send every record to an address that may not exist.
    if (flags.apiUrl === undefined && flags.yes) {
      cancel("--mode self-hosted needs --api-url.");
      process.exit(1);
    }
    const urlAnswer =
      flags.apiUrl ??
      (await ask("--api-url", () =>
        text({
          message: "Backend URL (full POST endpoint)",
          placeholder: "https://your-backend.example.com/v1/consent",
          validate: (val) => urlProblem(val ?? ""),
        }),
      ));
    if (isCancel(urlAnswer)) {
      cancel("Setup cancelled.");
      process.exit(0);
    }
    backendURL = (urlAnswer as string).trim();
  }

  // ── Regulation ─────────────────────────────────────────────────────────────
  const regulationAnswer =
    flags.regulation ??
    (flags.yes
      ? "GDPR"
      : await ask("--regulation", () =>
          select({
            message: "Which privacy regulation applies?",
            options: [
              { value: "GDPR" as const, label: "GDPR", hint: "European Union — opt-in" },
              { value: "CCPA" as const, label: "CCPA", hint: "California / US — opt-out" },
            ],
            initialValue: "GDPR" as const,
          }),
        ));

  if (isCancel(regulationAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const regulation = regulationAnswer as "GDPR" | "CCPA";

  // ── Color scheme ───────────────────────────────────────────────────────────
  const colorSchemeAnswer =
    flags.colorScheme ??
    (flags.yes
      ? "light"
      : await ask("--color-scheme", () =>
          select({
            message: "Color scheme",
            options: [
              { value: "light" as const, label: "Light" },
              { value: "dark" as const, label: "Dark" },
            ],
            initialValue: "light" as const,
          }),
        ));

  if (isCancel(colorSchemeAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const colorScheme = colorSchemeAnswer as "light" | "dark";

  // ── Extra languages (English is always available) ─────────────────────────
  const localesAnswer =
    flags.locales ??
    (flags.yes
      ? []
      : await ask("--locales", () =>
          multiselect({
            message: "Extra languages? (space to toggle, English always included)",
            options: [
              { value: "es" as const, label: "Spanish (es)" },
              { value: "fr" as const, label: "French (fr)" },
              { value: "de" as const, label: "German (de)" },
            ],
            required: false,
            initialValues: [],
          }),
        ));

  if (isCancel(localesAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const locales = (localesAnswer as Locale[]) ?? [];

  // ── Install ────────────────────────────────────────────────────────────────
  const pkg = pkgForFramework(framework);

  const installAnswer =
    flags.install ??
    (flags.yes
      ? true
      : await ask("--install or --no-install", () =>
          confirm({
            message: `Install ${pc.cyan(pkg)} now?`,
            initialValue: true,
          }),
        ));

  if (isCancel(installAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }

  // ── Build options bundle ───────────────────────────────────────────────────
  const optionInputs: OptionInputs = {
    mode,
    regulation,
    colorScheme,
    backendURL,
    locales,
  };
  const isCCPA = regulation === "CCPA";

  // ── Write files ────────────────────────────────────────────────────────────
  console.log();

  if (framework === "nextjs") {
    const paths = nextProjectPaths(cwd);
    const providerLabel = relative(cwd, paths.providerPath);
    const indexLabel = relative(cwd, paths.indexPath);
    const layoutLabel = relative(cwd, paths.appLayoutPath);
    const pagesAppLabel = relative(cwd, paths.pagesAppPath);

    log.info(
      `Detected ${pc.cyan(paths.layout === "src" ? "src/ layout" : "root layout")} · ${pc.cyan(paths.router === "app" ? "App Router" : "Pages Router")}`,
    );

    if (!existsSync(paths.providerPath)) {
      writeFile(paths.providerPath, nextjsProviderTemplate(optionInputs, isCCPA), providerLabel);
    } else {
      log.info(`${pc.yellow(providerLabel)} already exists — skipped.`);
    }

    if (!existsSync(paths.indexPath)) {
      writeFile(paths.indexPath, indexTemplate(), indexLabel);
    } else {
      log.info(`${pc.yellow(indexLabel)} already exists — skipped.`);
    }

    if (paths.router === "app") {
      if (existsSync(paths.appLayoutPath)) {
        const src = readFileSync(paths.appLayoutPath, "utf-8");
        const patched = patchNextjsLayout(src);
        if (patched) {
          writeFileSync(paths.appLayoutPath, patched, "utf-8");
          log.success(`Updated ${pc.cyan(layoutLabel)}`);
        } else {
          log.info(`${pc.yellow(layoutLabel)} already uses CookieYesRoot — skipped.`);
        }
      } else {
        writeFile(paths.appLayoutPath, nextjsLayoutTemplate(), layoutLabel);
      }
    } else {
      if (existsSync(paths.pagesAppPath)) {
        const src = readFileSync(paths.pagesAppPath, "utf-8");
        const patched = patchNextjsPagesApp(src);
        if (patched) {
          writeFileSync(paths.pagesAppPath, patched, "utf-8");
          log.success(`Updated ${pc.cyan(pagesAppLabel)}`);
        } else {
          log.info(`${pc.yellow(pagesAppLabel)} already uses CookieYesRoot — skipped.`);
        }
      } else {
        note(
          [
            `Mount <CookieYesRoot /> in ${pagesAppLabel}:`,
            ``,
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
          ].join("\n"),
          "Manual step needed",
        );
      }
    }
  } else if (framework === "react") {
    const paths = reactProjectPaths(cwd);
    const providerLabel = relative(cwd, paths.providerPath);
    const indexLabel = relative(cwd, paths.indexPath);

    log.info(`Detected ${pc.cyan(paths.layout === "src" ? "src/ layout" : "root layout")}`);

    if (!existsSync(paths.providerPath)) {
      writeFile(paths.providerPath, reactProviderTemplate(optionInputs, isCCPA), providerLabel);
    } else {
      log.info(`${pc.yellow(providerLabel)} already exists — skipped.`);
    }

    if (!existsSync(paths.indexPath)) {
      writeFile(paths.indexPath, indexTemplate(), indexLabel);
    } else {
      log.info(`${pc.yellow(indexLabel)} already exists — skipped.`);
    }

    const patchedEntry = patchReactEntry(paths.entryCandidates);
    if (patchedEntry) {
      log.success(`Updated ${pc.cyan(patchedEntry)} — mounted CookieYesRoot`);
    } else {
      note(
        [
          `Mount <CookieYesRoot /> alongside your root component:`,
          ``,
          `import { CookieYesRoot } from "./components/consent-manager";`,
          ``,
          `<>`,
          `  <App />`,
          `  <CookieYesRoot />`,
          `</>`,
        ].join("\n"),
        "Manual step needed",
      );
    }
  } else if (framework === "vue") {
    if (nuxt) {
      note(
        [
          `This is a Nuxt project, which the Vue setup does not patch, so nothing was written.`,
          `Run the CLI again and pick Nuxt, or pass --framework nuxt.`,
        ].join("\n"),
        "Manual step needed",
      );
      outro(`Nothing was installed.`);
      return;
    }
    const paths = vueProjectPaths(cwd);
    const rootLabel = "src/components/CookieYesRoot.vue";

    if (!existsSync(paths.consentManagerPath)) {
      writeFile(
        paths.consentManagerPath,
        vueConsentManagerTemplate(optionInputs, paths.typescript),
        paths.consentManagerLabel,
      );
    } else {
      log.info(`${pc.yellow(paths.consentManagerLabel)} already exists, skipped.`);
    }

    if (!existsSync(paths.rootPath)) {
      writeFile(paths.rootPath, vueRootTemplate(paths.typescript, isCCPA), rootLabel);
    } else {
      log.info(`${pc.yellow(rootLabel)} already exists, skipped.`);
    }

    const main = patchFile(paths.entryPath, patchVueMain, /setupConsent/);
    if (main === "patched") {
      log.success(`Updated ${pc.cyan(paths.entryLabel)}: called setupConsent`);
    } else if (main === "already") {
      log.info(`${pc.yellow(paths.entryLabel)} already calls setupConsent, skipped.`);
    } else {
      note(
        [
          `Call setupConsent(app) in ${paths.entryLabel}, after createApp and before mount:`,
          ``,
          `import { setupConsent } from "./consent-manager";`,
          ``,
          `const app = createApp(App);`,
          `setupConsent(app);`,
          `app.mount("#app");`,
        ].join("\n"),
        "Manual step needed",
      );
    }

    const app = patchFile(paths.appPath, patchVueApp, /CookieYesRoot/);
    if (app === "patched") {
      log.success(`Updated ${pc.cyan("src/App.vue")}: mounted CookieYesRoot`);
    } else if (app === "already") {
      log.info(`${pc.yellow("src/App.vue")} already uses CookieYesRoot, skipped.`);
    } else {
      note(
        [
          `Render <CookieYesRoot /> once in src/App.vue, before the page content:`,
          ``,
          `<script setup${paths.typescript ? ' lang="ts"' : ""}>`,
          `import CookieYesRoot from "./components/CookieYesRoot.vue";`,
          `</script>`,
          ``,
          `<template>`,
          `  <CookieYesRoot />`,
          `  <!-- your page content -->`,
          `</template>`,
        ].join("\n"),
        "Manual step needed",
      );
    }
  } else if (framework === "nuxt") {
    const paths = nuxtProjectPaths(cwd);
    const appConfig = nuxtAppConfigTemplate(optionInputs);

    const config =
      paths.configPath === null
        ? "missing"
        : patchFile(paths.configPath, patchNuxtConfig, /["']@cookieyes\/nuxt["']/);
    if (config === "patched") {
      log.success(`Updated ${pc.cyan(paths.configLabel)}: added @cookieyes/nuxt to modules`);
    } else if (config === "already") {
      log.info(`${pc.yellow(paths.configLabel)} already lists @cookieyes/nuxt, skipped.`);
    } else {
      note(
        [
          `Add @cookieyes/nuxt to the modules in ${paths.configLabel}:`,
          ``,
          `export default defineNuxtConfig({`,
          `  modules: ["@cookieyes/nuxt"],`,
          `});`,
        ].join("\n"),
        "Manual step needed",
      );
    }

    if (paths.existingAppConfigLabel === null) {
      writeFile(paths.appConfigPath, appConfig, paths.appConfigLabel);
    } else {
      note(
        [
          `${paths.existingAppConfigLabel} already exists, so it was left as it is.`,
          `Add the cookieyes key to the object it passes to defineAppConfig:`,
          ``,
          appConfig.trimEnd(),
        ].join("\n"),
        "Manual step needed",
      );
    }

    const app = patchFile(paths.appPath, patchNuxtApp, /CookieYesRoot/);
    if (app === "patched") {
      log.success(`Updated ${pc.cyan(paths.appLabel)}: mounted CookieYesRoot`);
    } else if (app === "already") {
      log.info(`${pc.yellow(paths.appLabel)} already uses CookieYesRoot, skipped.`);
    } else {
      note(
        [
          `Render <CookieYesRoot /> once in ${paths.appLabel}, before the page content.`,
          `Nuxt imports it for you:`,
          ``,
          `<template>`,
          `  <CookieYesRoot />`,
          `  <NuxtPage />`,
          `</template>`,
        ].join("\n"),
        "Manual step needed",
      );
    }
  } else if (framework === "svelte") {
    const paths = svelteProjectPaths(cwd);
    const rootLabel = "src/lib/CookieYesRoot.svelte";

    if (!existsSync(paths.configPath)) {
      writeFile(
        paths.configPath,
        svelteConfigTemplate(optionInputs, paths.typescript),
        paths.configLabel,
      );
    } else {
      log.info(`${pc.yellow(paths.configLabel)} already exists, skipped.`);
    }

    if (!existsSync(paths.rootPath)) {
      writeFile(paths.rootPath, svelteRootTemplate(paths.typescript, isCCPA), rootLabel);
    } else {
      log.info(`${pc.yellow(rootLabel)} already exists, skipped.`);
    }

    const main = patchFile(paths.entryPath, patchSvelteMain, /@cookieyes\/svelte\/styles\.css/);
    if (main === "patched") {
      log.success(`Updated ${pc.cyan(paths.entryLabel)}: imported the stylesheet`);
    } else if (main === "already") {
      log.info(`${pc.yellow(paths.entryLabel)} already imports the stylesheet, skipped.`);
    } else {
      note(
        [
          `Import the stylesheet where the app starts, in ${paths.entryLabel}.`,
          `Without it the banner renders unstyled:`,
          ``,
          `import "@cookieyes/svelte/styles.css";`,
        ].join("\n"),
        "Manual step needed",
      );
    }

    const app = patchFile(paths.appPath, patchSvelteApp, /CookieYesRoot/);
    if (app === "patched") {
      log.success(`Updated ${pc.cyan("src/App.svelte")}: mounted CookieYesRoot`);
    } else if (app === "already") {
      log.info(`${pc.yellow("src/App.svelte")} already uses CookieYesRoot, skipped.`);
    } else {
      note(
        [
          `Wrap your page content in <CookieYesRoot> once in src/App.svelte:`,
          ``,
          `<script${paths.typescript ? ' lang="ts"' : ""}>`,
          `  import CookieYesRoot from "./lib/CookieYesRoot.svelte";`,
          `</script>`,
          ``,
          `<CookieYesRoot>`,
          `  <!-- your page content -->`,
          `</CookieYesRoot>`,
        ].join("\n"),
        "Manual step needed",
      );
    }
  } else {
    // Vanilla
    const consentPath = join(cwd, "src", "consent.ts");
    if (!existsSync(join(cwd, "src"))) mkdirSync(join(cwd, "src"), { recursive: true });
    if (!existsSync(consentPath)) {
      writeFile(consentPath, vanillaTemplate(optionInputs), "src/consent.ts");
    } else {
      log.info(`${pc.yellow("src/consent.ts")} already exists — skipped.`);
    }
  }

  // ── Install dependencies ──────────────────────────────────────────────────
  const wantTranslations = locales.length > 0;

  if (installAnswer) {
    const s = spinner();
    s.start(`Installing ${pkg}...`);
    try {
      await installPackage(pkg, pm, cwd);
      s.stop(`Installed ${pc.green(pkg)}`);
    } catch {
      s.stop(pc.red("Installation failed"));
      log.warn(`Install manually: ${pc.cyan(installHint(pm, pkg))}`);
    }

    if (wantTranslations) {
      const t = spinner();
      t.start(`Installing @cookieyes/translations...`);
      try {
        await installPackage("@cookieyes/translations", pm, cwd);
        t.stop(`Installed ${pc.green("@cookieyes/translations")}`);
      } catch {
        t.stop(pc.red("Translations install failed"));
        log.warn(`Install manually: ${pc.cyan(installHint(pm, "@cookieyes/translations"))}`);
      }
    }
  } else {
    log.info(`Install when ready: ${pc.cyan(installHint(pm, pkg))}`);
    if (wantTranslations) {
      log.info(`Also install translations: ${pc.cyan(installHint(pm, "@cookieyes/translations"))}`);
    }
  }

  note(
    `${pc.yellow("★")} Enjoying CookieYes? A GitHub star helps a lot:\n${pc.cyan("https://github.com/cookieyes/cookieyes")}`,
    "Support the project",
  );

  // TODO: switch to https://docs.cookieyes.com once the docs site is live.
  outro(`${pc.green("✓")} Done! Docs: ${pc.cyan("https://github.com/cookieyes/cookieyes#readme")}`);
}
