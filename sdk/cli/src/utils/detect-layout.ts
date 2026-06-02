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
