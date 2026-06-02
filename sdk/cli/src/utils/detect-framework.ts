import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Framework = "nextjs" | "react" | "vanilla";

export function detectFramework(cwd = process.cwd()): Framework | null {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    if ("next" in deps) return "nextjs";
    if ("react" in deps) return "react";
    return "vanilla";
  } catch {
    return null;
  }
}
