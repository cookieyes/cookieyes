/// <reference path="../src/__tests__/provided.d.ts" />
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "basic");
const vite = join(
  dirname(createRequire(import.meta.url).resolve("vite/package.json")),
  "bin",
  "vite.js",
);

const servers: ChildProcess[] = [];

/**
 * Builds the fixture app with the built package, and serves the build. Uses `dist/`, so run
 * `pnpm build` first (CI's conformance job builds before `pnpm test:browser`).
 */
export async function setup(project: TestProject): Promise<void> {
  if (!existsSync(join(here, "..", "dist", "index.js"))) {
    throw new Error("Build @cookieyes/sveltekit first: these tests use dist/.");
  }
  // Vitest sets NODE_ENV to "test", which would build SvelteKit's and Svelte's development code.
  execFileSync(process.execPath, [vite, "build"], {
    cwd: fixture,
    env: { ...process.env, NODE_ENV: "production" },
    stdio: "pipe",
  });
  project.provide("baseUrl", await serve());
}

async function serve(): Promise<string> {
  const port = 4000 + Math.floor(Math.random() * 1000);
  const url = `http://127.0.0.1:${port}`;
  servers.push(
    spawn(process.execPath, [join(fixture, "build", "index.js")], {
      env: {
        ...process.env,
        NODE_ENV: "production",
        PORT: String(port),
        HOST: "127.0.0.1",
        ORIGIN: url,
      },
      stdio: "ignore",
    }),
  );
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(url)).ok) break;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  return url;
}

export function teardown(): void {
  for (const server of servers) server.kill();
}
