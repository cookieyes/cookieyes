// Runs inside the throwaway consumer project that install.mjs creates, after the
// package manager under test installed the tarballs. It never runs from the repo, so
// nothing in the workspace can satisfy an import the installed packages cannot.
//
// For every published package:
//   - every JS sub-path in "exports" loads with `import` and with `require`
//   - every stylesheet sub-path resolves to a file
//   - the copy that resolves, and the copy each sibling @cookieyes package resolves, is
//     the tarball under test and not a registry copy of the same version
// Then `initCookieYes()` runs with the documented minimal config, both ways.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const expected = JSON.parse(readFileSync(new URL("./gate-expected.json", import.meta.url), "utf8"));
const failures = [];
let passed = 0;

/**
 * Identifies an installed copy by its package.json and its `require` entry. The entry
 * alone was not enough: a release that changes only types or `exports` has the same
 * code as the published version, and a registry copy passed (tested).
 */
function fingerprint(entryPath, entry) {
  const root = entryPath.slice(0, -entry.length);
  const hash = createHash("sha256");
  for (const file of [`${root}package.json`, entryPath]) hash.update(readFileSync(file));
  return hash.digest("hex");
}
const firstLine = (error) => String(error?.message ?? error).split("\n")[0];

async function check(label, fn) {
  try {
    await fn();
    passed++;
  } catch (error) {
    failures.push(`${label}: ${firstLine(error)}`);
  }
}

for (const [name, pkg] of Object.entries(expected.packages)) {
  for (const subpath of pkg.subpaths) {
    const spec = subpath === "." ? name : `${name}/${subpath.slice(2)}`;
    if (subpath.endsWith(".css")) {
      await check(`resolve ${spec}`, () => {
        if (readFileSync(require.resolve(spec)).length === 0) {
          throw new Error("resolved to an empty file");
        }
      });
      continue;
    }
    await check(`import ${spec}`, () => import(spec));
    await check(`require ${spec}`, () => require(spec));
  }

  if (!pkg.requireEntry) continue;
  await check(`${name} is the tarball under test`, () => {
    if (fingerprint(require.resolve(name), pkg.requireEntry) !== pkg.fingerprint) {
      throw new Error(`${require.resolve(name)} is not the copy in the tarball`);
    }
  });
  // A sibling the package depends on must resolve to the tarball too. Without this,
  // a package manager that fetched the same version from the registry would pass
  // with code this release does not contain.
  const fromPackage = createRequire(require.resolve(name));
  for (const dep of pkg.siblings) {
    await check(`${name} -> ${dep} is the tarball under test`, () => {
      const { requireEntry, fingerprint: wanted } = expected.packages[dep];
      if (fingerprint(fromPackage.resolve(dep), requireEntry) !== wanted) {
        throw new Error(`resolved ${fromPackage.resolve(dep)}, not the tarball's copy`);
      }
    });
  }
}

// The documented minimal configuration (getting-started/installation).
const minimalConfig = { mode: "cookie-only", regulation: "GDPR" };
await check("initCookieYes() via import", async () => {
  const { initCookieYes } = await import("@cookieyes/core");
  if (typeof initCookieYes(minimalConfig) !== "object") throw new Error("returned no runtime");
});
await check("initCookieYes() via require", () => {
  const { initCookieYes } = require("@cookieyes/core");
  if (typeof initCookieYes(minimalConfig) !== "object") throw new Error("returned no runtime");
});

console.log(`${passed} checks passed`);
if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}
