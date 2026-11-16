import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Framework = "nextjs" | "react" | "vue" | "vanilla";

function readDeps(cwd: string): Record<string, string> | null {
  const pkgPath = join(cwd, "package.json");
  if (!existsSync(pkgPath)) return null;
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    return { ...pkg.dependencies, ...pkg.devDependencies };
  } catch {
    return null;
  }
}

export function detectFramework(cwd = process.cwd()): Framework | null {
  const deps = readDeps(cwd);
  if (!deps) return null;
  if ("next" in deps) return "nextjs";
  if ("react" in deps) return "react";
  // Nuxt depends on vue, but the Vue setup patches `main.ts`, which a Nuxt app does not
  // have, so a Nuxt project must never be taken for a plain Vue one.
  if ("vue" in deps && !("nuxt" in deps)) return "vue";
  return "vanilla";
}

/** Whether the project depends on Nuxt, which the Vue setup does not support yet. */
export function isNuxtProject(cwd = process.cwd()): boolean {
  const deps = readDeps(cwd);
  return deps !== null && "nuxt" in deps;
}
