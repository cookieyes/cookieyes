import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";

vi.mock("@nuxt/kit", () => ({
  defineNuxtModule: (definition: unknown) => definition,
}));

const nuxt = await import("../index.js");

/**
 * The package entry is the module plus a few constants. Adding or removing a runtime export is an
 * API change: update this list, the docs and the changeset together.
 */
describe("@cookieyes/nuxt exports", () => {
  it("exports exactly the module and the stylesheet constants", () => {
    expect(Object.keys(nuxt).sort()).toEqual(
      ["CRITICAL_CSS", "CRITICAL_CSS_HASH", "DEFAULT_STYLES_HREF", "default"].sort(),
    );
  });

  it("defaults the stylesheet path to the one @cookieyes/nextjs uses", () => {
    expect(nuxt.DEFAULT_STYLES_HREF).toBe("/cookieyes/styles.css");
  });
});

describe("the published module type", () => {
  const dts = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "dist", "index.d.ts");

  // Nuxt types the `cookieyes` key in nuxt.config.ts by inferring the options from this
  // declaration. Inferred rather than written, it once carried @nuxt/kit's unresolved generic
  // name, and the key accepted anything.
  it.skipIf(!existsSync(dts))(
    "declares the module with its options, so nuxt.config.ts is typed",
    () => {
      expect(readFileSync(dts, "utf8")).toContain(
        "NuxtModule<ModuleOptions, ModuleOptions, false>",
      );
    },
  );
});
