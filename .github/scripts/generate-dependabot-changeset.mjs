// Generates a Changesets entry for a Dependabot PR — but only when the bump
// touches a *published* package's runtime `dependencies` / `peerDependencies`.
//
// Why: our release pipeline (`changesets/action`) only versions & publishes when
// a changeset file is present. Dependabot never writes one, so a runtime-dep
// bump would land on `main` yet never reach npm. Dev-dependency and
// github-actions bumps correctly produce nothing here (no shipped code changes).
//
// Uses only Node built-ins and git — it never runs any code from the PR.
import { execSync } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";

const baseSha = process.env.BASE_SHA;
const prNumber = process.env.PR_NUMBER || "dependabot";

function setOutput(created) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `created=${created}\n`);
  }
}

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf8" });
}

if (!baseSha) {
  console.error("BASE_SHA env var is required.");
  process.exit(1);
}

// Make sure the base commit is available locally (shallow checkouts may lack it).
try {
  execSync(`git cat-file -e ${baseSha}^{commit}`, { stdio: "ignore" });
} catch {
  execSync(`git fetch --no-tags --depth=1 origin ${baseSha}`, { stdio: "inherit" });
}

// Idempotency: if this PR already has an auto changeset, do nothing.
const existing = existsSync(".changeset")
  ? readdirSync(".changeset").filter((f) => f.startsWith("dependabot-"))
  : [];
if (existing.length > 0) {
  console.log(`Changeset already present (${existing.join(", ")}); nothing to do.`);
  setOutput(false);
  process.exit(0);
}

// Every changed package.json (root or nested), base -> HEAD.
const changedFiles = git(`diff --name-only ${baseSha} HEAD`)
  .split("\n")
  .map((s) => s.trim())
  .filter((f) => f === "package.json" || f.endsWith("/package.json"));

const affectedPackages = new Set(); // published package names whose runtime deps changed
const bumpedDeps = new Set(); // the dependency names that moved

for (const file of changedFiles) {
  let oldJson = {};
  try {
    oldJson = JSON.parse(git(`show ${baseSha}:${file}`));
  } catch {
    // File is new at HEAD — treat as no prior deps.
  }
  const newJson = JSON.parse(readFileSync(file, "utf8"));

  if (!newJson.name || newJson.private === true) continue; // skip unpublished/private

  for (const section of ["dependencies", "peerDependencies"]) {
    const before = oldJson[section] || {};
    const after = newJson[section] || {};
    for (const dep of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (before[dep] !== after[dep]) {
        affectedPackages.add(newJson.name);
        bumpedDeps.add(dep);
      }
    }
  }
}

if (affectedPackages.size === 0) {
  console.log("No published-package runtime dependency changed — no changeset needed.");
  setOutput(false);
  process.exit(0);
}

const frontmatter = [...affectedPackages]
  .sort()
  .map((name) => `"${name}": patch`)
  .join("\n");
const depList = [...bumpedDeps].sort().join(", ");
const noun = bumpedDeps.size > 1 ? "dependencies" : "dependency";
const content = `---\n${frontmatter}\n---\n\nUpdate runtime ${noun} (${depList}).\n`;

const outPath = `.changeset/dependabot-pr-${prNumber}.md`;
writeFileSync(outPath, content);
console.log(`Wrote ${outPath}:\n\n${content}`);
setOutput(true);
