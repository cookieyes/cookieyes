import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Walk up from `cwd` to the filesystem root looking for a lock file. */
function findLockFile(cwd: string): PackageManager | null {
  let dir = cwd;
  while (true) {
    if (existsSync(join(dir, "bun.lockb"))) return "bun";
    if (existsSync(join(dir, "pnpm-lock.yaml"))) return "pnpm";
    if (existsSync(join(dir, "yarn.lock"))) return "yarn";
    if (existsSync(join(dir, "package-lock.json"))) return "npm";
    const parent = dirname(dir);
    if (parent === dir) break; // reached root
    dir = parent;
  }
  return null;
}

export function detectPackageManager(cwd = process.cwd()): PackageManager {
  return findLockFile(cwd) ?? "npm";
}

export function addCommand(pm: PackageManager, pkg: string): readonly [string, readonly string[]] {
  switch (pm) {
    case "pnpm":
      return ["pnpm", ["add", pkg]] as const;
    case "yarn":
      return ["yarn", ["add", pkg]] as const;
    case "bun":
      return ["bun", ["add", pkg]] as const;
    default:
      return ["npm", ["install", pkg]] as const;
  }
}
