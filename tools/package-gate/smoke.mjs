// Runs inside the throwaway consumer project that install.mjs creates, after the
// package manager under test installed the tarballs. It never runs from the repo, so
// nothing in the workspace can satisfy an import the installed packages cannot.
//
// For every published package:
//   - every JS sub-path in "exports" loads with `import` and with `require` (for a package that
//     ships `.svelte` files, which Node cannot load, it resolves to a file that exists instead,
//     and `@cookieyes/sveltekit/styles-route` to a file that exports `GET`; `@cookieyes/astro/components`,
//     which re-exports `.astro` files, resolves and every file it names exists)
//   - every stylesheet sub-path resolves to a file
//   - the copy that resolves, and the copy each sibling @cookieyes package resolves, is
//     the tarball under test and not a registry copy of the same version
// Then `initCookieYes()` runs with the documented minimal config, both ways.

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

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
/**
 * Packages whose entry imports `.svelte` files. Node has no loader for them, so loading the
 * entry fails however correct the package is (and `@cookieyes/sveltekit` imports `$app/*`,
 * which only a SvelteKit build provides); they are checked by resolving instead, and by the
 * `svelte` export condition, which is what Svelte's tooling follows.
 */
const SVELTE_COMPONENTS = new Set(["@cookieyes/svelte", "@cookieyes/sveltekit"]);
/** Sub-paths that re-export `.astro` files, which only Astro's compiler can load. */
const ASTRO_COMPONENTS = new Set(["@cookieyes/astro/components"]);
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
    if (ASTRO_COMPONENTS.has(spec)) {
      await check(`resolve ${spec}`, () => {
        const entry = fileURLToPath(import.meta.resolve(spec));
        const files = [
          ...readFileSync(entry, "utf8").matchAll(/from\s*["'](\.\/[^"']+\.astro)["']/g),
        ];
        if (files.length === 0) throw new Error("re-exports no .astro file");
        for (const [, file] of files) {
          if (!existsSync(fileURLToPath(new URL(file, `file://${entry}`)))) {
            throw new Error(`${file} is missing`);
          }
        }
      });
      continue;
    }
    if (SVELTE_COMPONENTS.has(name)) {
      await check(`resolve ${spec}`, () => {
        const entry = fileURLToPath(import.meta.resolve(spec));
        if (!existsSync(entry)) throw new Error(`${entry} does not exist`);
        // The route is plain JavaScript that a SvelteKit app re-exports from a `+server` file.
        if (subpath === "./styles-route") {
          if (
            !/export (async )?function GET|export \{[^}]*\bGET\b/.test(readFileSync(entry, "utf8"))
          ) {
            throw new Error("the styles route does not export GET");
          }
          return;
        }
        const root = fileURLToPath(import.meta.resolve(name)).slice(0, -pkg.requireEntry.length);
        const target = JSON.parse(readFileSync(`${root}package.json`, "utf8")).exports[subpath];
        const component = target?.svelte;
        if (!component || !existsSync(`${root}${component.replace(/^\.\//, "")}`)) {
          throw new Error(`the "svelte" condition of ${subpath} does not point at a file`);
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

await check("@cookieyes/vue exposes the plugin and getCookieYes", async () => {
  const vue = await import("@cookieyes/vue");
  if (typeof vue.CookieYes?.install !== "function") throw new Error("CookieYes is not a plugin");
  if (typeof vue.getCookieYes !== "function") throw new Error("getCookieYes is missing");
});

await check("@cookieyes/nuxt exposes a Nuxt module under the cookieyes key", async () => {
  const nuxt = await import("@cookieyes/nuxt");
  if (typeof nuxt.default !== "function") throw new Error("the default export is not a module");
  const meta = await nuxt.default.getMeta?.();
  if (meta?.configKey !== "cookieyes") throw new Error("the module's config key is not cookieyes");
});

await check("@cookieyes/astro exposes an Astro integration", async () => {
  const astro = await import("@cookieyes/astro");
  const integration = astro.default();
  if (integration?.name !== "@cookieyes/astro") throw new Error("the integration is misnamed");
  if (typeof integration.hooks?.["astro:config:setup"] !== "function") {
    throw new Error("the integration has no astro:config:setup hook");
  }
});

console.log(`${passed} checks passed`);
if (failures.length) {
  for (const failure of failures) console.error(`✗ ${failure}`);
  process.exit(1);
}
