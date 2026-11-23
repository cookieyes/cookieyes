/// <reference types="node" />
import { type ChildProcess, fork } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll } from "vitest";
import type { CookieYesRequestState } from "../server-consent.js";

/** Plain data describing a page; see `fixtures/RootPage.svelte`. */
export type PageSpec = {
  /** A fixed regulation. Without it the config detects the region, see the fixture. */
  regulation?: "GDPR" | "CCPA" | "DEFAULT";
  state?: CookieYesRequestState;
  /** Renders page content as `children`. */
  content?: boolean;
  /** Renders a `ui` snippet in place of the stock components. */
  customUi?: boolean;
};

type Reply = { id: number; body?: string; head?: string; error?: string; ready?: boolean };

// A path, not a `URL`: under jsdom the global `URL` is jsdom's, which `node:fs` rejects.
const HERE = dirname(fileURLToPath(import.meta.url));
let child: ChildProcess | null = null;
let ready: Promise<void> | null = null;
let nextId = 1;
const pending = new Map<number, (reply: Reply) => void>();

function start(): Promise<void> {
  if (ready) return ready;
  child = fork(join(HERE, "ssr-server.mjs"), [], {
    cwd: join(HERE, "..", ".."),
    execArgv: [],
    env: { ...process.env, NODE_ENV: "test" },
  });
  // The channel would otherwise keep the test worker alive after the last test.
  child.unref();
  child.channel?.unref();
  ready = new Promise((resolve, reject) => {
    child?.on("message", (reply: Reply) => {
      if (reply.ready) resolve();
      else pending.get(reply.id)?.(reply);
    });
    child?.on("error", reject);
    child?.on("exit", () => reject(new Error("the SSR server process exited")));
  });
  return ready;
}

/**
 * Renders a page on the server in a separate process and returns what it wrote for the body and
 * the head. The body carries the hydration markers Svelte's client expects.
 */
export async function renderOnServer(
  spec: PageSpec,
  fixture = "src/__tests__/fixtures/RootPage.svelte",
): Promise<{ body: string; head: string }> {
  await start();
  const id = nextId++;
  const reply = await new Promise<Reply>((resolve) => {
    pending.set(id, resolve);
    child?.send({ id, fixture: join(HERE, "..", "..", fixture), props: { spec } });
  });
  pending.delete(id);
  if (reply.error) throw new Error(reply.error);
  return { body: reply.body ?? "", head: reply.head ?? "" };
}

/** Stops the server process. Call it once from an `afterAll`. */
export function stopServer(): void {
  child?.kill();
  child = null;
  ready = null;
}

/**
 * Starts the server before the file's tests, with room for a slow machine: starting Vite takes
 * longer than a test's own timeout when every package's tests run at once. Stops it afterwards.
 */
export function useServerRenderer(): void {
  beforeAll(start, 60_000);
  afterAll(stopServer);
}
