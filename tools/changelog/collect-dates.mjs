/**
 * Records the publish date of every released package version, from its git tag.
 *
 * The changelog pages are generated from the package CHANGELOG.md files, which
 * changesets writes on every release — but changesets records no dates, and the
 * only place a release date exists is the tag the release workflow pushes.
 *
 * Tags are not available in CI, which checks out shallow, so the dates are collected
 * here and committed. Run this after a release, from a clone that has the tags, and
 * commit the result:
 *
 *   pnpm changelog:dates
 *
 * The web build reads the committed file and refuses to build if a version in a
 * CHANGELOG.md has no date here, so a release cannot reach the site undated.
 *
 * Existing entries are kept, so a version that was published without a tag can be
 * dated by hand here and will survive the next run.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "release-dates.json");

const lines = execFileSync(
  "git",
  ["for-each-ref", "--format=%(refname:short)\t%(creatordate:short)", "refs/tags"],
  { cwd: join(here, "..", ".."), encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean);

if (lines.length === 0) {
  process.stderr.write(
    "[changelog:dates] no tags found. Fetch them first: git fetch --tags origin\n",
  );
  process.exit(1);
}

const dates = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : {};
for (const line of lines) {
  const [tag, date] = line.split("\t");
  // Release tags are "@scope/name@version"; anything else is not a package release.
  if (tag?.startsWith("@cookieyes/") && date) dates[tag] = date;
}

const sorted = Object.fromEntries(Object.entries(dates).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(outFile, `${JSON.stringify(sorted, null, 2)}\n`);
process.stdout.write(`[changelog:dates] recorded ${Object.keys(sorted).length} releases\n`);
