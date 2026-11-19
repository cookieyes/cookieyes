/// <reference path="../src/__tests__/provided.d.ts" />
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "basic");
const nuxi = join(
  dirname(createRequire(import.meta.url).resolve("nuxt/package.json")),
  "bin",
  "nuxt.mjs",
);

const servers: ChildProcess[] = [];

/**
 * Builds the fixture app twice with the built module, once for a server and once with
 * `nuxt generate`, and serves the server build. Uses `dist/`, so run `pnpm build` first (CI's
 * conformance job builds before `pnpm test:browser`).
 */
export async function setup(project: TestProject): Promise<void> {
  if (!existsSync(join(here, "..", "dist", "index.js"))) {
    throw new Error("Build @cookieyes/nuxt first: these tests use dist/.");
  }
  const run = (args: string[], outputDir: string) =>
    execFileSync(process.execPath, [nuxi, ...args], {
      cwd: fixture,
      env: { ...process.env, FIXTURE_OUTPUT_DIR: outputDir, NUXT_TELEMETRY_DISABLED: "1" },
      stdio: "pipe",
    });
  run(["build"], ".output");
  run(["generate"], ".output-static");

  project.provide("baseUrl", await serve({}, "/"));
  // The same build, configured at run time: a base path and a region config whose strictest
  // regulation is CCPA, with Germany mapped to GDPR.
  project.provide(
    "variantUrl",
    await serve(
      {
        NUXT_APP_BASE_URL: "/app/",
        NUXT_PUBLIC_COOKIEYES_REGION: JSON.stringify({
          map: { DE: "GDPR", "US-CA": "CCPA" },
          strictest: "CCPA",
        }),
      },
      "/app/",
    ),
  );
  project.provide("staticDir", join(fixture, ".output-static", "public"));
}

async function serve(env: Record<string, string>, path: string): Promise<string> {
  const port = 4000 + Math.floor(Math.random() * 1000);
  servers.push(
    spawn(process.execPath, [join(fixture, ".output", "server", "index.mjs")], {
      env: { ...process.env, ...env, PORT: String(port), HOST: "127.0.0.1" },
      stdio: "ignore",
    }),
  );
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}${path}`)).ok) break;
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
