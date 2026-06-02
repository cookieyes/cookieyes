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
import { nextProjectPaths, reactProjectPaths } from "../utils/detect-layout.js";
import { detectPackageManager, type PackageManager } from "../utils/detect-pm.js";
import { installPackage } from "../utils/install.js";
import { insertImport, patchNextjsLayout, patchNextjsPagesApp } from "../utils/patchers.js";

// ─── Option builders ──────────────────────────────────────────────────────────

type Locale = "es" | "fr" | "de";

type OptionInputs = {
  mode: "self-hosted" | "offline";
  regulation: "GDPR" | "CCPA";
  colorScheme: "light" | "dark";
  backendURL?: string | undefined;
  locales: Locale[];
};

function buildBuilderChain(opts: OptionInputs, indent: string): string {
  const lines: string[] = [`createCookieYes()`];
  lines.push(`${indent}.mode("${opts.mode}")`);

  if (opts.mode === "self-hosted" && opts.backendURL) {
    lines.push(`${indent}.backend({`);
    lines.push(`${indent}  async persist(payload) {`);
    lines.push(`${indent}    await fetch("${opts.backendURL}", {`);
    lines.push(`${indent}      method: "POST",`);
    lines.push(`${indent}      headers: { "Content-Type": "application/json" },`);
    lines.push(`${indent}      body: JSON.stringify(payload),`);
    lines.push(`${indent}    });`);
    lines.push(`${indent}  },`);
    lines.push(`${indent}})`);
  }

  lines.push(`${indent}.regulation("${opts.regulation}")`);
  lines.push(`${indent}.colorScheme("${opts.colorScheme}")`);

  if (opts.locales.length > 0) {
    lines.push(`${indent}.i18n({ messages: { ${opts.locales.join(", ")} } })`);
  }

  lines.push(`${indent}.mount();`);
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
    `  createCookieYes,`,
    `} from "@cookieyes/nextjs";`,
    ``,
    `${buildBuilderChain(opts, "  ")}`,
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
    `  createCookieYes,`,
    `} from "@cookieyes/react";`,
    ``,
    `${buildBuilderChain(opts, "  ")}`,
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

function vanillaOptionsLiteral(opts: OptionInputs): string {
  const lines: string[] = ["{"];
  lines.push(`  mode: "${opts.mode}",`);
  if (opts.mode === "self-hosted" && opts.backendURL) {
    lines.push(`  backend: {`);
    lines.push(`    async persist(payload) {`);
    lines.push(`      await fetch("${opts.backendURL}", {`);
    lines.push(`        method: "POST",`);
    lines.push(`        headers: { "Content-Type": "application/json" },`);
    lines.push(`        body: JSON.stringify(payload),`);
    lines.push(`      });`);
    lines.push(`    },`);
    lines.push(`  },`);
  }
  lines.push(`  overrides: { regulation: "${opts.regulation}" },`);
  lines.push(`  colorScheme: "${opts.colorScheme}",`);
  if (opts.locales.length > 0) {
    lines.push(`  i18n: { messages: { ${opts.locales.join(", ")} } },`);
  }
  lines.push(`}`);
  return lines.join("\n");
}

function vanillaTemplate(opts: OptionInputs): string {
  const coreImport = `import { getOrCreateConsentRuntime } from "@cookieyes/core";`;
  const localeImports = localeImportLines(opts);

  return [
    coreImport,
    ...localeImports,
    ``,
    `// Create (or retrieve) the singleton consent runtime.`,
    `export const { consentManager, consentStore } = getOrCreateConsentRuntime(${vanillaOptionsLiteral(opts)});`,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function writeFile(path: string, content: string, label: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
  log.success(`Created ${pc.cyan(label)}`);
}

function pkgForFramework(framework: Framework): string {
  if (framework === "nextjs") return "@cookieyes/nextjs";
  if (framework === "react") return "@cookieyes/react";
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

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function runInit(): Promise<void> {
  const cwd = process.cwd();

  console.log();
  intro(pc.bgBlue(pc.bold(pc.white("  CookieYes  "))));

  const detected = detectFramework(cwd);
  const pm = detectPackageManager(cwd);

  // ── Framework ──────────────────────────────────────────────────────────────
  const frameworkAnswer = await select({
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
      { value: "vanilla" as const, label: "Vanilla JS / Other" },
    ],
    initialValue: detected ?? ("nextjs" as const),
  });

  if (isCancel(frameworkAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const framework = frameworkAnswer as Framework;

  // ── Mode ───────────────────────────────────────────────────────────────────
  const modeAnswer = await select({
    message: "Backend mode?",
    options: [
      { value: "offline" as const, label: "Offline", hint: "no backend — cookie-only" },
      { value: "self-hosted" as const, label: "Self-hosted", hint: "sync consent to your backend" },
    ],
    initialValue: "offline" as const,
  });

  if (isCancel(modeAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const mode = modeAnswer as "offline" | "self-hosted";

  // ── Backend URL (only when self-hosted) ────────────────────────────────────
  let backendURL: string | undefined;
  if (mode === "self-hosted") {
    const urlAnswer = await text({
      message: "Backend URL (full POST endpoint)",
      placeholder: "https://your-backend.example.com/v1/consent",
      validate(val) {
        const v = (val ?? "").trim();
        if (v.length === 0) return "Enter a valid URL or path (e.g. /api/consent)";
        if (v.startsWith("/")) return undefined; // allow relative paths
        try {
          new URL(v);
          return undefined;
        } catch {
          return "Enter a valid URL or path (e.g. /api/consent)";
        }
      },
    });
    if (isCancel(urlAnswer)) {
      cancel("Setup cancelled.");
      process.exit(0);
    }
    backendURL = (urlAnswer as string).trim();
  }

  // ── Regulation ─────────────────────────────────────────────────────────────
  const regulationAnswer = await select({
    message: "Which privacy regulation applies?",
    options: [
      { value: "GDPR" as const, label: "GDPR", hint: "European Union — opt-in" },
      { value: "CCPA" as const, label: "CCPA", hint: "California / US — opt-out" },
    ],
    initialValue: "GDPR" as const,
  });

  if (isCancel(regulationAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const regulation = regulationAnswer as "GDPR" | "CCPA";

  // ── Color scheme ───────────────────────────────────────────────────────────
  const colorSchemeAnswer = await select({
    message: "Color scheme",
    options: [
      { value: "light" as const, label: "Light" },
      { value: "dark" as const, label: "Dark" },
    ],
    initialValue: "light" as const,
  });

  if (isCancel(colorSchemeAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const colorScheme = colorSchemeAnswer as "light" | "dark";

  // ── Extra languages (English is always available) ─────────────────────────
  const localesAnswer = await multiselect({
    message: "Extra languages? (space to toggle, English always included)",
    options: [
      { value: "es" as const, label: "Spanish (es)" },
      { value: "fr" as const, label: "French (fr)" },
      { value: "de" as const, label: "German (de)" },
    ],
    required: false,
    initialValues: [],
  });

  if (isCancel(localesAnswer)) {
    cancel("Setup cancelled.");
    process.exit(0);
  }
  const locales = (localesAnswer as Locale[]) ?? [];

  // ── Install ────────────────────────────────────────────────────────────────
  const pkg = pkgForFramework(framework);

  const installAnswer = await confirm({
    message: `Install ${pc.cyan(pkg)} now?`,
    initialValue: true,
  });

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

  outro(`${pc.green("✓")} Done! Docs: ${pc.cyan("https://docs.cookieyes.com")}`);
}
