import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Framework =
  | "nextjs"
  | "react"
  | "vue"
  | "nuxt"
  | "astro"
  | "sveltekit"
  | "svelte"
  | "vanilla";

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
  // A SvelteKit app depends on `svelte` too, and the Svelte setup patches `src/main.ts` and
  // `App.svelte`, which a Kit app does not have (it renders from `src/routes`), so Kit is checked
  // first, ahead of Nuxt, React and Vue too: a `@sveltejs/kit` dependency names the framework, while
  // those can arrive in a Kit app as a library's dependency.
  if ("@sveltejs/kit" in deps) return "sveltekit";
  // An Astro site brings React, Vue or Svelte in only as an island framework, and the setups for
  // those patch an entry file an Astro site does not have, so `astro` is checked before all of them.
  if ("astro" in deps) return "astro";
  // Nuxt depends on vue, and the Vue setup patches `main.ts`, which a Nuxt app does not have,
  // so `nuxt` is checked first. Before react too: a `nuxt` dependency names the framework, while
  // react can arrive in a Nuxt app as a library's dependency.
  if ("nuxt" in deps) return "nuxt";
  if ("react" in deps) return "react";
  if ("vue" in deps) return "vue";
  if ("svelte" in deps) return "svelte";
  return "vanilla";
}
