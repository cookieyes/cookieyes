import { existsSync } from "node:fs";
import { join } from "node:path";

export type Layout = "src" | "root";
export type NextRouter = "app" | "pages";

const NEXT_APP_FILES = ["app/layout.tsx", "app/layout.jsx", "app/layout.ts", "app/layout.js"];

const NEXT_PAGES_FILES = ["pages/_app.tsx", "pages/_app.jsx", "pages/_app.ts", "pages/_app.js"];

const REACT_ENTRY_FILES = ["main.tsx", "main.jsx", "main.ts", "main.js", "index.tsx", "index.jsx"];

function anyExists(base: string, files: string[]): boolean {
  return files.some((f) => existsSync(join(base, f)));
}

export function detectNextLayout(cwd: string = process.cwd()): Layout {
  const srcBase = join(cwd, "src");
  if (anyExists(srcBase, NEXT_APP_FILES) || anyExists(srcBase, NEXT_PAGES_FILES)) {
    return "src";
  }
  return "root";
}

export function detectNextRouter(cwd: string, layout: Layout): NextRouter {
  const base = layout === "src" ? join(cwd, "src") : cwd;
  if (anyExists(base, NEXT_APP_FILES)) return "app";
  if (anyExists(base, NEXT_PAGES_FILES)) return "pages";
  return "app";
}

export function detectReactLayout(cwd: string = process.cwd()): Layout {
  if (anyExists(join(cwd, "src"), REACT_ENTRY_FILES)) return "src";
  if (anyExists(cwd, REACT_ENTRY_FILES)) return "root";
  return "src";
}

export type NextProjectPaths = {
  layout: Layout;
  router: NextRouter;
  baseDir: string;
  providerPath: string;
  indexPath: string;
  appLayoutPath: string;
  pagesAppPath: string;
};

export function nextProjectPaths(cwd: string): NextProjectPaths {
  const layout = detectNextLayout(cwd);
  const router = detectNextRouter(cwd, layout);
  const baseDir = layout === "src" ? join(cwd, "src") : cwd;
  return {
    layout,
    router,
    baseDir,
    providerPath: join(baseDir, "components", "consent-manager", "provider.tsx"),
    indexPath: join(baseDir, "components", "consent-manager", "index.tsx"),
    appLayoutPath: join(baseDir, "app", "layout.tsx"),
    pagesAppPath: join(baseDir, "pages", "_app.tsx"),
  };
}

export type ReactEntryCandidate = { path: string; label: string };

export type ReactProjectPaths = {
  layout: Layout;
  baseDir: string;
  providerPath: string;
  indexPath: string;
  entryCandidates: ReactEntryCandidate[];
};

export function reactProjectPaths(cwd: string): ReactProjectPaths {
  const layout = detectReactLayout(cwd);
  const baseDir = layout === "src" ? join(cwd, "src") : cwd;
  const labelPrefix = layout === "src" ? "src/" : "";
  return {
    layout,
    baseDir,
    providerPath: join(baseDir, "components", "consent-manager", "provider.tsx"),
    indexPath: join(baseDir, "components", "consent-manager", "index.tsx"),
    entryCandidates: [
      { path: join(baseDir, "main.tsx"), label: `${labelPrefix}main.tsx` },
      { path: join(baseDir, "main.jsx"), label: `${labelPrefix}main.jsx` },
      { path: join(baseDir, "index.tsx"), label: `${labelPrefix}index.tsx` },
      { path: join(baseDir, "index.jsx"), label: `${labelPrefix}index.jsx` },
    ],
  };
}

export type VueProjectPaths = {
  /** Whether the project's entry file is TypeScript; JavaScript only when `main.js` alone exists. */
  typescript: boolean;
  consentManagerPath: string;
  consentManagerLabel: string;
  rootPath: string;
  entryPath: string;
  entryLabel: string;
  appPath: string;
};

export function vueProjectPaths(cwd: string): VueProjectPaths {
  const src = join(cwd, "src");
  const typescript = existsSync(join(src, "main.ts")) || !existsSync(join(src, "main.js"));
  const ext = typescript ? "ts" : "js";
  return {
    typescript,
    consentManagerPath: join(src, `consent-manager.${ext}`),
    consentManagerLabel: `src/consent-manager.${ext}`,
    rootPath: join(src, "components", "CookieYesRoot.vue"),
    entryPath: join(src, `main.${ext}`),
    entryLabel: `src/main.${ext}`,
    appPath: join(src, "App.vue"),
  };
}

export type NuxtProjectPaths = {
  /** The existing `nuxt.config.*`, or null when the project has none. */
  configPath: string | null;
  configLabel: string;
  /** Where a new app config goes, in Nuxt's source directory. */
  appConfigPath: string;
  appConfigLabel: string;
  /** An `app.config.*` the project already has, which is never overwritten. */
  existingAppConfigLabel: string | null;
  appPath: string;
  appLabel: string;
};

const NUXT_CONFIG_FILES = ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"];
const NUXT_APP_CONFIG_FILES = ["app.config.ts", "app.config.js", "app.config.mjs"];

export function nuxtProjectPaths(cwd: string): NuxtProjectPaths {
  const config = NUXT_CONFIG_FILES.find((f) => existsSync(join(cwd, f)));
  // JavaScript only when the Nuxt config is a `.js` or `.mjs` file, as the Vue setup does.
  const typescript = config === undefined || config.endsWith(".ts");
  // Nuxt 4 takes `app/` as its source directory when it exists, and the project root otherwise.
  // A Nuxt 3 layout keeps `app.vue` in the root even when an `app/` folder holds other files.
  const rootApp = existsSync(join(cwd, "app.vue")) && !existsSync(join(cwd, "app", "app.vue"));
  const prefix = existsSync(join(cwd, "app")) && !rootApp ? "app/" : "";
  const appConfig = `app.config.${typescript ? "ts" : "js"}`;
  const existing = NUXT_APP_CONFIG_FILES.find((f) => existsSync(join(cwd, prefix, f)));
  return {
    configPath: config === undefined ? null : join(cwd, config),
    configLabel: config ?? "nuxt.config.ts",
    appConfigPath: join(cwd, prefix, appConfig),
    appConfigLabel: `${prefix}${appConfig}`,
    existingAppConfigLabel: existing === undefined ? null : `${prefix}${existing}`,
    appPath: join(cwd, prefix, "app.vue"),
    appLabel: `${prefix}app.vue`,
  };
}
