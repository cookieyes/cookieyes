/// <reference path="../src/__tests__/provided.d.ts" />
import { type ChildProcess, execFileSync, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, "fixtures", "basic");
const astroBin = join(
  dirname(createRequire(import.meta.url).resolve("astro/package.json")),
  "bin",
  "astro.mjs",
);

let staticServer: Server | undefined;
let nodeServer: ChildProcess | undefined;

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
};

/** A static host: files from `dir`, `/path` served from `/path/index.html`. */
function serveStatic(dir: string): Promise<string> {
  const server = createServer((req, res) => {
    const path = normalize(decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname));
    let file = join(dir, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
    if (!existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(readFileSync(file));
  });
  staticServer = server;
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
    });
  });
}

/**
 * Builds the fixture twice with the built integration, static and with the Node adapter, and
 * serves both. Uses `dist/`, so run `pnpm build` first (CI's conformance job builds before
 * `pnpm test:browser`).
 */
export async function setup(project: TestProject): Promise<void> {
  if (!existsSync(join(here, "..", "dist", "index.js"))) {
    throw new Error("Build @cookieyes/astro first: these tests use dist/.");
  }
  const build = (env: Record<string, string>) =>
    execFileSync(process.execPath, [astroBin, "build"], {
      cwd: fixture,
      env: { ...process.env, ...env, ASTRO_TELEMETRY_DISABLED: "1" },
      stdio: "pipe",
    });
  build({ FIXTURE_OUT_DIR: "dist" });
  build({ FIXTURE_OUT_DIR: "dist-server", FIXTURE_OUTPUT: "server" });

  project.provide("staticUrl", await serveStatic(join(fixture, "dist")));

  const port = 4000 + Math.floor(Math.random() * 1000);
  nodeServer = spawn(process.execPath, [join(fixture, "dist-server", "server", "entry.mjs")], {
    env: { ...process.env, PORT: String(port), HOST: "127.0.0.1" },
    stdio: "ignore",
  });
  const url = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(`${url}/`)).ok) break;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  project.provide("serverUrl", url);
}

export function teardown(): void {
  staticServer?.close();
  nodeServer?.kill();
}
