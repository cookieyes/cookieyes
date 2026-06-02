import type { TranslationMap } from "@cookieyes/core";
import { describe, expect, it } from "vitest";
import { de } from "../de.js";
import { en } from "../en.js";
import { es } from "../es.js";
import { fr } from "../fr.js";
import { it as itIT } from "../it.js";

const LOCALES: Record<string, TranslationMap> = { en, de, es, fr, it: itIT };

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
  it("ships en, de, es, fr, it", () => {
    expect(Object.keys(LOCALES).sort()).toEqual(["de", "en", "es", "fr", "it"]);
  });
});
