import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as ui from "../index.js";

/**
 * Nothing in this package is public unless an adapter uses it. A shared layer
 * that nobody builds on stops being tested by real use and rots, which is the
 * failure this package exists to avoid. So every runtime export must be
 * imported by the source of an adapter (`@cookieyes/vanilla`,
 * `@cookieyes/react`) or of the conformance suite in `@cookieyes/test`.
 */
const CONSUMERS = ["vanilla", "react", "test"];

/**
 * Exports kept without an adapter importing them, each with its reason.
 * Adding to this list is a decision for review, not a way to make this pass.
 */
const KEPT: Record<string, string> = {
  computeThemeVars:
    "the theme token contract: what each setting turns into, read by the theme tests of every adapter",
};

function sources(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name !== "__tests__") out.push(...sources(full));
    } else if (/\.tsx?$/.test(name)) {
      out.push(readFileSync(full, "utf8"));
    }
  }
  return out;
}

function namesFromUi(code: string): Set<string> {
  const names = new Set<string>();
  for (const match of code.matchAll(/(?:import|export)\s*\{([^}]*)\}\s*from\s*"@cookieyes\/ui"/g)) {
    for (const raw of (match[1] ?? "").split(",")) {
      const name = raw
        .replace(/^\s*type\s+/, "")
        .split(/\s+as\s+/)[0]
        ?.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

describe("@cookieyes/ui consumers", () => {
  it("has an adapter or the conformance suite using every runtime export", () => {
    const used = new Set<string>();
    for (const pkg of CONSUMERS) {
      for (const code of sources(join(process.cwd(), "..", pkg, "src"))) {
        for (const name of namesFromUi(code)) used.add(name);
      }
    }
    const unused = Object.keys(ui).filter((name) => !used.has(name) && !(name in KEPT));
    expect(unused, "exported but used by no adapter: use it, or stop exporting it").toEqual([]);
  });

  it("keeps no exception that has since gained a user", () => {
    const used = new Set<string>();
    for (const pkg of CONSUMERS) {
      for (const code of sources(join(process.cwd(), "..", pkg, "src"))) {
        for (const name of namesFromUi(code)) used.add(name);
      }
    }
    expect(Object.keys(KEPT).filter((name) => used.has(name))).toEqual([]);
  });
});
