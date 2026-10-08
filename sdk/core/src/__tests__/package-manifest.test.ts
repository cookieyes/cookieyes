/// <reference types="node" />
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The READMEs and the site say core has zero dependencies. Anyone can check that
 * with one `npm view`, so a dependency added here would make the claim false the
 * moment it was published.
 */
describe("@cookieyes/core package.json", () => {
  const manifest = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));

  it("declares no runtime dependencies", () => {
    expect(manifest.dependencies ?? {}).toEqual({});
  });

  it("declares no peer or optional dependencies that would install alongside it", () => {
    expect(manifest.peerDependencies ?? {}).toEqual({});
    expect(manifest.optionalDependencies ?? {}).toEqual({});
  });
});
