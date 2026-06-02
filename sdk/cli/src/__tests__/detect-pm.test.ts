import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { addCommand, detectPackageManager } from "../utils/detect-pm.js";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "cy-pm-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("detectPackageManager", () => {
  it("defaults to npm when no lock file exists", () => {
    expect(detectPackageManager(dir)).toBe("npm");
  });

  it.each([
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"],
  ] as const)("detects %s as %s", (lockFile, expected) => {
    writeFileSync(join(dir, lockFile), "", "utf-8");
    expect(detectPackageManager(dir)).toBe(expected);
  });

  it("walks up parent directories to find the lock file", () => {
    writeFileSync(join(dir, "pnpm-lock.yaml"), "", "utf-8");
    const nested = join(dir, "packages", "app");
    mkdirSync(nested, { recursive: true });
    expect(detectPackageManager(nested)).toBe("pnpm");
  });
});

describe("addCommand", () => {
  it.each([
    ["npm", ["npm", ["install", "@cookieyes/react"]]],
    ["pnpm", ["pnpm", ["add", "@cookieyes/react"]]],
    ["yarn", ["yarn", ["add", "@cookieyes/react"]]],
    ["bun", ["bun", ["add", "@cookieyes/react"]]],
  ] as const)("builds the %s add command", (pm, expected) => {
    const [cmd, args] = addCommand(pm, "@cookieyes/react");
    expect([cmd, args]).toEqual(expected);
  });
});
