import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** Packages whose code the measurement covers. */
const PACKAGES = ["core", "react", "nextjs"];

/**
 * A short hash of everything that determines the measured bundle.
 *
 * `size-report.json` records this alongside its figures, and the docs site
 * refuses to publish a figure whose fingerprint no longer matches the tree. That
 * is the check that keeps a published size honest: it fails when the code the
 * number describes has changed, and stays quiet when it hasn't.
 *
 * ## What it deliberately leaves out
 *
 * **Every package's `version`.** The first version of this guard compared
 * versions instead, and that is wrong in both directions. It false-positives on
 * the changesets release PR, which bumps versions and CHANGELOGs and touches no
 * code at all — the measurement it is guarding is still valid, but the build
 * fails and the release pipeline stops. It also false-negatives on the case that
 * actually matters, a code change landing without a version bump, which is
 * every ordinary pull request.
 *
 * **Tests.** They cannot reach a consumer's bundle.
 *
 * ## What it covers
 *
 * Sources and stylesheets, each package's Rollup config, the shared Rollup
 * config, and the manifest fields that drive externalisation and tree-shaking
 * (`exports`, `sideEffects`, `dependencies`, `peerDependencies`). A change to
 * any of those can move the measured figure; a change to anything else cannot.
 */
export function sdkFingerprint() {
  const files = [];

  const walk = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        // Tests are not shipped, so they cannot change the figure.
        if (name !== "__tests__") walk(full);
      } else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) {
        files.push(full);
      }
    }
  };

  for (const pkg of PACKAGES) {
    const src = join(REPO, "sdk", pkg, "src");
    if (existsSync(src)) walk(src);
    const config = join(REPO, "sdk", pkg, "rollup.config.mjs");
    if (existsSync(config)) files.push(config);
  }
  const shared = join(REPO, "rollup.shared.mjs");
  if (existsSync(shared)) files.push(shared);

  const hash = createHash("sha256");
  for (const file of files.sort()) {
    // Hash the path too, so moving a file is a change even if its bytes are not.
    hash.update(file.slice(REPO.length));
    hash.update(readFileSync(file));
  }

  for (const pkg of PACKAGES) {
    const manifestPath = join(REPO, "sdk", pkg, "package.json");
    if (!existsSync(manifestPath)) continue;
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    hash.update(
      JSON.stringify({
        name: manifest.name,
        exports: manifest.exports,
        sideEffects: manifest.sideEffects,
        dependencies: manifest.dependencies,
        peerDependencies: manifest.peerDependencies,
      }),
    );
  }

  return hash.digest("hex").slice(0, 16);
}
