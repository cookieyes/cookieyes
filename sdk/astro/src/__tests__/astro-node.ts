import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

/**
 * Whether this Node can run the `astro` devDependency. Its `engines.node` floor (22.23.4 for 7.4)
 * is above the repo's floor of 20, so the tests that build the fixture site skip below it rather
 * than fail; the package itself still installs on Node 20.
 */
export function canRunAstro(): boolean {
  const pkg = createRequire(import.meta.url).resolve("astro/package.json");
  const floor = (JSON.parse(readFileSync(pkg, "utf8")) as { engines?: { node?: string } }).engines
    ?.node;
  const want = /(\d+)\.(\d+)\.(\d+)/
    .exec(floor ?? "")
    ?.slice(1)
    .map(Number) ?? [0, 0, 0];
  const have = process.versions.node.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    if ((have[i] ?? 0) !== (want[i] ?? 0)) return (have[i] ?? 0) > (want[i] ?? 0);
  }
  return true;
}
