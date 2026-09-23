/**
 * Builds the changelog pages from the package CHANGELOG.md files.
 *
 * Those files are written by changesets on every release and are the only record
 * of what shipped. Until now the docs restated them by hand in MDX, which is how
 * the site fell five releases behind: publishing a release and describing it were
 * two separate jobs, and only one of them was automated.
 *
 * Releases are grouped and addressed by the date they were published, read from
 * `tools/changelog/release-dates.json` (see tools/changelog/collect-dates.mjs).
 * There is no invented "v1.4.0"-style umbrella number: every version a reader sees
 * is one they can pass to npm.
 *
 * Output is `apps/web/content/docs/changelog/` — index, one page per release, and
 * meta.json for the sidebar. The whole directory is generated and gitignored.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { replaceEmDashes } from "./lib/replace-em-dashes.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..", "..", "..");
const sdkDir = join(repoRoot, "sdk");
const outDir = join(here, "..", "content", "docs", "changelog");

function fail(message) {
  process.stderr.write(`[generate-changelog] ${message}\n`);
  process.exit(1);
}

const datesFile = join(repoRoot, "tools", "changelog", "release-dates.json");
if (!existsSync(datesFile)) {
  fail(`no release dates at ${datesFile}. Run \`pnpm changelog:dates\` and commit the result.`);
}
const releaseDates = JSON.parse(readFileSync(datesFile, "utf8"));

// The one authored part of the changelog — see the file's own note. Optional: a
// release with no line is labelled by its package version alone.
const titlesFile = join(repoRoot, "tools", "changelog", "release-titles.json");
const releaseTitles = existsSync(titlesFile) ? JSON.parse(readFileSync(titlesFile, "utf8")) : {};

/**
 * Splits one CHANGELOG.md into `version -> [{ bump, id, body }]`.
 *
 * Every version is a key, including one whose only entries were dependency bumps:
 * it was still published, so it belongs in that release's Install list.
 *
 * The dependency-bump entries themselves are dropped — "Updated dependencies
 * [abc1234]" and the `- @cookieyes/core@0.7.0` lines under it say only that a
 * sibling moved, which the Install list already shows.
 */
function parseChangelog(markdown) {
  const versions = new Map();
  const versionBlocks = markdown.split(/^## (?=\S)/m).slice(1);

  for (const block of versionBlocks) {
    const version = block.slice(0, block.indexOf("\n")).trim();
    const entries = [];
    versions.set(version, entries);
    for (const kindBlock of block.split(/^### /m).slice(1)) {
      const heading = kindBlock.slice(0, kindBlock.indexOf("\n")).trim();
      const bump = heading.replace(/ Changes$/, "").toLowerCase();
      const lines = kindBlock.slice(kindBlock.indexOf("\n") + 1).split("\n");

      let current = null;
      const flush = () => {
        if (!current) return;
        const text = current.join("\n").trim();
        // Changesets prefixes each entry with its changeset id, which is how the
        // same change is recognised across the packages it touched.
        const match = /^([0-9a-f]{7,40}): ([\s\S]*)$/.exec(text);
        if (match?.[2]) entries.push({ bump, id: match[1], body: match[2] });
        current = null;
      };

      for (const line of lines) {
        if (line.startsWith("- ")) {
          flush();
          if (line.startsWith("- Updated dependencies")) continue;
          current = [line.slice(2)];
        } else if (current) {
          // Continuation lines are indented two spaces by changesets; un-indent them
          // so the body is valid markdown on its own.
          current.push(line.startsWith("  ") ? line.slice(2) : line);
        }
      }
      flush();
    }
  }
  return versions;
}

/** Collect every dated release, keyed by date. */
const releases = new Map();
const undated = [];

for (const dir of readdirSync(sdkDir)) {
  const manifestPath = join(sdkDir, dir, "package.json");
  const changelogPath = join(sdkDir, dir, "CHANGELOG.md");
  if (!existsSync(manifestPath) || !existsSync(changelogPath)) continue;

  const { name } = JSON.parse(readFileSync(manifestPath, "utf8"));
  // A package with no tag at all has never been released through the workflow, so
  // it has nothing to appear in the changelog for — @cookieyes/test is one.
  const everReleased = Object.keys(releaseDates).some((tag) => tag.startsWith(`${name}@`));
  if (!everReleased) continue;

  for (const [version, entries] of parseChangelog(readFileSync(changelogPath, "utf8"))) {
    const date = releaseDates[`${name}@${version}`];
    if (!date) {
      undated.push(`${name}@${version}`);
      continue;
    }
    if (!releases.has(date)) releases.set(date, { date, packages: new Map(), changes: new Map() });
    const release = releases.get(date);
    release.packages.set(name, version);

    for (const entry of entries) {
      // Keyed by id *and* body. The id is the commit's short sha, so every change
      // released in the same commit shares one — keying by id alone silently
      // collapsed four separate changes into one. The body is what is actually
      // identical when one change lands in several packages.
      const key = `${entry.id}::${entry.body}`;
      const existing = release.changes.get(key);
      // One change lands in several packages. Keep it once, under the largest bump
      // it caused, and remember every package it moved.
      if (existing) {
        existing.packages.add(name);
        if (rank(entry.bump) > rank(existing.bump)) existing.bump = entry.bump;
      } else {
        release.changes.set(key, { ...entry, packages: new Set([name]) });
      }
    }
  }
}

function rank(bump) {
  return bump === "major" ? 3 : bump === "minor" ? 2 : 1;
}

if (undated.length > 0) {
  fail(
    `these released versions have no date:\n  ${[...new Set(undated)].join("\n  ")}\n` +
      "  Run `pnpm changelog:dates` and commit tools/changelog/release-dates.json.",
  );
}
if (releases.size === 0) fail("no releases found. Are the package CHANGELOG.md files present?");

const ordered = [...releases.values()].sort((a, b) => b.date.localeCompare(a.date));

/** "2026-09-18" -> "18 September 2026". */
const MONTHS =
  "January February March April May June July August September October November December".split(
    " ",
  );
function longDate(iso) {
  const [year, month, day] = iso.split("-");
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}
function monthLabel(iso) {
  const [year, month] = iso.split("-");
  return `${MONTHS[Number(month) - 1]} ${year}`;
}

/** "@cookieyes/react" -> "react", the short name ReleaseInstall renders. */
function shortName(name) {
  return name.replace("@cookieyes/", "");
}

/** The most-installed packages first, so the list reads the way a reader thinks. */
const PACKAGE_ORDER = ["react", "nextjs", "core", "cli", "scripts", "translations"];

/**
 * How a release is named: the version of the most prominent package it shipped.
 *
 * It replaces the invented "v1.4.0" umbrella the design mocks. Every release bumps
 * several packages at once, so one of them has to stand for the release — and this
 * one is a number the reader can pass to npm, which the umbrella never was.
 */
function releaseName(release) {
  const lead = orderedPackages(release)[0];
  return `${lead.name} ${lead.version}`;
}

/** "react 0.9.0: Accessibility fixes…", or just the version when none is written. */
function releaseLabel(release) {
  const headline = releaseTitles[release.date];
  return headline ? `${releaseName(release)}: ${headline}` : releaseName(release);
}
function orderedPackages(release) {
  return [...release.packages.entries()]
    .map(([name, version]) => ({ name: shortName(name), version }))
    .sort((a, b) => PACKAGE_ORDER.indexOf(a.name) - PACKAGE_ORDER.indexOf(b.name));
}

/**
 * The changeset's opening sentence, which is its own summary of itself.
 *
 * The card renders plain text, so the inline markdown a changeset author used —
 * backticks, bold, italics — is stripped rather than shown as punctuation.
 */
function summarise(body) {
  const firstLine = body.split("\n", 1)[0].trim();
  const sentence = /^(.+?[.!?])(\s|$)/.exec(firstLine);
  return (sentence?.[1] ?? firstLine).replace(/\*\*|[`_*]/g, "");
}

function changesByBump(release) {
  const all = [...release.changes.values()];
  return [
    { label: "Minor", items: all.filter((c) => c.bump === "major" || c.bump === "minor") },
    { label: "Patch", items: all.filter((c) => c.bump === "patch") },
  ].filter((group) => group.items.length > 0);
}

/** JSON is valid JSX expression syntax, and safely escapes whatever is in the text. */
function jsx(value) {
  return JSON.stringify(value);
}

function releasePage(release) {
  const name = releaseName(release);
  const headline = releaseTitles[release.date];
  const lines = [
    "---",
    // The full label titles the sidebar entry and the breadcrumb; the page's own h1
    // shows just the part before the em dash, which the docs route already handles.
    `title: ${jsx(releaseLabel(release))}`,
    `description: ${jsx(`${headline ?? name}. The CookieYes SDK release of ${longDate(release.date)}.`)}`,
    "---",
    "",
    `<ReleaseBadges date="${release.date}" />`,
    "",
    `<ReleaseSummary headline=${jsx(headline ?? name)}>`,
    `This release published ${orderedPackages(release)
      .map((p) => `\`@cookieyes/${p.name}@${p.version}\``)
      .join(", ")
      .replace(/, ([^,]*)$/, " and $1")}.`,
    "</ReleaseSummary>",
    "",
    "<ReleaseRule />",
    "",
    "### Install",
    "",
    `<ReleaseInstall packages={${JSON.stringify(orderedPackages(release))}} />`,
    "",
  ];

  for (const group of changesByBump(release)) {
    lines.push(`### ${group.label} changes`, "");
    for (const change of group.items) {
      lines.push(change.body.trim(), "");
      lines.push(
        `*In ${[...change.packages]
          .map((n) => `\`${n}\``)
          .sort()
          .join(", ")}.*`,
        "",
      );
    }
  }

  lines.push("### Source", "", `<ReleaseSource version=${jsx(name)} />`, "");
  return lines.join("\n");
}

function indexCard(release) {
  const highlights = changesByBump(release).flatMap((group) =>
    group.items.map((change) => ({ kind: group.label, text: summarise(change.body) })),
  );
  const headline = releaseTitles[release.date];
  return [
    "<ChangelogEntry",
    `  version=${jsx(releaseName(release))}`,
    ...(headline ? [`  title=${jsx(headline)}`] : []),
    `  date="${release.date}"`,
    `  highlights={${JSON.stringify(highlights, null, 2).replace(/\n/g, "\n  ")}}`,
    "/>",
  ].join("\n");
}

function indexPage() {
  const lines = [
    "---",
    "title: Changelog",
    "description: All notable changes to the CookieYes SDK. Follows Keep a Changelog and Semantic Versioning.",
    "---",
    "",
    '<div className="cy-doc-cl-page">',
    "",
  ];

  let month = null;
  for (const release of ordered) {
    const label = monthLabel(release.date);
    if (label !== month) {
      lines.push(`## ${label}`, "");
      month = label;
    }
    lines.push(indexCard(release), "");
  }

  lines.push("</div>", "");
  return lines.join("\n");
}

function metaJson() {
  // "index" stays: it is what binds this folder's `root: true` to the changelog pages,
  // and dropping it makes the sidebar fall back to the whole docs tree. Its own nav
  // link is hidden in CSS instead — the design's `#sbCl` lists releases and nothing else.
  const pages = ["index"];
  let month = null;
  for (const release of ordered) {
    const label = monthLabel(release.date);
    if (label !== month) {
      pages.push(`--- ${label} ---`);
      month = label;
    }
    pages.push(release.date);
  }
  return `${JSON.stringify({ title: "Changelog", root: true, pages }, null, 2)}\n`;
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "index.mdx"), replaceEmDashes(indexPage()));
writeFileSync(join(outDir, "meta.json"), metaJson());
for (const release of ordered) {
  // The release text is copied from the packages' own CHANGELOG.md files; the site
  // prints it with plain punctuation, and those files are left as written.
  writeFileSync(join(outDir, `${release.date}.mdx`), replaceEmDashes(releasePage(release)));
}

process.stdout.write(
  `[generate-changelog] ${ordered.length} releases, ${ordered[0].date} to ${
    ordered[ordered.length - 1].date
  }\n`,
);
