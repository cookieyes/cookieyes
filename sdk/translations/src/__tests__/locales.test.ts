/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import type { TranslationMap } from "@cookieyes/core";
import { describe, expect, it } from "vitest";
import { en } from "../en.js";

// Every src/<code>.ts other than index.ts is a locale, discovered rather than
// listed, so a contributor's new file is checked without registering it here.
const CODES = readdirSync(new URL("../", import.meta.url))
  .filter((file) => file.endsWith(".ts") && file !== "index.ts")
  .map((file) => file.slice(0, -".ts".length))
  .sort();

// A locale file exports a const named after its code, hyphens dropped:
// es.ts → `es`, pt-BR.ts → `ptBR`.
const exportName = (code: string): string => code.replace(/-/g, "");

// `.ts`, not the usual `.js`: Vite turns this template into a glob over real files.
const MODULES: Record<string, Record<string, unknown>> = {};
for (const code of CODES) {
  MODULES[code] = (await import(`../${code}.ts`)) as Record<string, unknown>;
}
const LOCALES: Record<string, TranslationMap> = {};
for (const code of CODES) {
  const table = MODULES[code]?.[exportName(code)];
  if (table) LOCALES[code] = table as TranslationMap;
}

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  exports: Record<string, unknown>;
};

const CATEGORIES = [
  "necessary",
  "functional",
  "analytics",
  "performance",
  "advertisement",
] as const;

// Recursively collect dotted key paths for every leaf string in a map.
function leafPaths(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v !== null && typeof v === "object"
      ? leafPaths(v as Record<string, unknown>, path)
      : [path];
  });
}

function leaf(obj: TranslationMap, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined,
      obj,
    );
}

const enPaths = leafPaths(en as unknown as Record<string, unknown>).sort();

describe.each(Object.entries(LOCALES))("locale: %s", (name, table) => {
  it("has the exact same key set as the English reference", () => {
    const paths = leafPaths(table as unknown as Record<string, unknown>).sort();
    expect(paths).toEqual(enPaths);
  });

  it("has a non-empty string at every leaf", () => {
    for (const path of enPaths) {
      const value = leaf(table, path);
      expect(typeof value, `${name}.${path} should be a string`).toBe("string");
      expect((value as string).trim().length, `${name}.${path} is empty`).toBeGreaterThan(0);
    }
  });

  it("defines all five consent categories with label + description", () => {
    for (const cat of CATEGORIES) {
      expect(table.categories[cat].label.trim().length).toBeGreaterThan(0);
      expect(table.categories[cat].description.trim().length).toBeGreaterThan(0);
    }
  });

  it("keeps the {seconds} placeholder in the opt-out countdown", () => {
    expect(table.optOut.successCountdown).toContain("{seconds}");
  });

  it("does not contain leftover HTML tags from the source schema", () => {
    for (const path of enPaths) {
      const value = leaf(table, path) as string;
      expect(value, `${name}.${path} contains HTML`).not.toMatch(/<\/?[a-z][^>]*>/i);
    }
  });
});

describe("catalog", () => {
  it("includes the English reference", () => {
    expect(CODES).toContain("en");
  });

  it.each(CODES)("%s exports its table under the expected name", (code) => {
    expect(
      MODULES[code]?.[exportName(code)],
      `src/${code}.ts must export \`const ${exportName(code)}: TranslationMap\``,
    ).toBeTypeOf("object");
  });

  it.each(CODES)("%s is published as its own sub-path", (code) => {
    expect(
      pkg.exports[`./${code}`],
      `add "./${code}" to "exports" in sdk/translations/package.json`,
    ).toEqual({
      types: `./dist/${code}.d.ts`,
      import: `./dist/${code}.js`,
      require: `./dist/${code}.cjs`,
    });
  });

  it("publishes no sub-path without a locale file behind it", () => {
    const subpaths = Object.keys(pkg.exports)
      .filter((key) => key !== ".")
      .map((key) => key.slice("./".length));
    expect(subpaths.sort()).toEqual(CODES);
  });
});
