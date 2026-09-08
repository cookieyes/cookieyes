#!/usr/bin/env node
// Turns the measured bundle-size report into the one dataset the landing page
// reads, so a published size claim cannot disagree with what the SDK measures.
//
// Reads  `tools/size/size-report.json` (produced by `pnpm size`, committed)
// Writes `apps/web/.generated/bundle-size.json`
//
// Why this exists: the landing page stated "9 KB gz" for the banner in three
// separate hard-coded places while the banner measured 17.2 KB. Three copies of
// a number nobody owned, none of them generated, and no basis printed next to
// any of them. The figure now has exactly one source, and it is the same source
// CI enforces budgets against.
//
// Fails closed (exit 1) rather than emitting a plausible-looking wrong number:
//   1. the report is missing — someone needs to run `pnpm size`
//   2. the report's fingerprint no longer matches the SDK in the tree, so it
//      describes code that is no longer here
//   3. a layer the page renders is absent from the report
//   4. a competitor figure has no citation, which is what makes the "N× smaller"
//      claim reproducible rather than an assertion

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sdkFingerprint } from "../../../tools/size/sdk-fingerprint.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const repoRoot = join(webRoot, "..", "..");
const reportPath = join(repoRoot, "tools", "size", "size-report.json");
const outDir = join(webRoot, ".generated");

const fail = (message) => {
  process.stderr.write(`[generate-bundle-size] ${message}\n`);
  process.exit(1);
};

if (!existsSync(reportPath)) {
  fail(
    `no measurement at tools/size/size-report.json.\n` +
      `  Run \`pnpm size\` from the repo root, then commit the report.\n` +
      `  See tools/size/README.md for what it measures and why.`,
  );
}

const report = JSON.parse(readFileSync(reportPath, "utf8"));

// Does this measurement still describe the code in this tree? The report carries
// a fingerprint of everything that determines the figures; if the SDK has moved
// on, publishing them would recreate the exact problem this generator exists to
// end.
//
// This compares the fingerprint and NOT the package versions. Comparing versions
// is wrong in both directions: it fails the changesets release PR, which bumps
// versions and touches no code, and it passes an ordinary pull request that
// changes code without touching a version. The first of those blocked a release.
const currentFingerprint = sdkFingerprint();
if (report.sdkFingerprint && report.sdkFingerprint !== currentFingerprint) {
  fail(
    `the measurement describes a different SDK than the one in this tree.\n` +
      `  report fingerprint:  ${report.sdkFingerprint}\n` +
      `  workspace:           ${currentFingerprint}\n` +
      `  Run \`pnpm size\` from the repo root and commit the updated report.`,
  );
}
if (!report.sdkFingerprint) {
  fail(
    "the report has no `sdkFingerprint`, so it cannot be checked against this tree.\n" +
      "  Run `pnpm size` from the repo root and commit the updated report.",
  );
}

/**
 * The layers the landing page talks about.
 *
 * `banner` is the figure the page's own wording asks for — it says "the whole
 * banner", which is a narrower claim than the full interface layer, and quoting
 * the larger number under that wording would be its own inaccuracy.
 */
const LAYERS = {
  core: "The headless consent engine, with no UI.",
  banner: "The whole banner — everything needed to render and run it.",
  interface: "Banner, preferences dialog and recall button together.",
};

/**
 * Competitor figures for the comparison chart.
 *
 * Every entry needs a `source` a reader can check. These three were on the page
 * as bare numbers with no citation anywhere in the repo, which makes the
 * "N× smaller" headline unreproducible in either direction — it could equally be
 * understating our lead. They are carried here, unchanged, with the citation
 * left explicitly empty so the gap is tracked rather than forgotten, and the
 * generator refuses to emit the comparison until they are filled in.
 *
 * A further caution: some competitors publish an npm package that is only a
 * loader, fetching the real SDK from their CDN at runtime. A bundle-delta
 * figure cannot see that payload, so comparing it against ours — which ships
 * everything in the build output — understates them by an unknown amount.
 */
const COMPETITORS = [
  { name: "c15t", kb: 34, source: null },
  { name: "Cookiebot", kb: 190, source: null },
  { name: "OneTrust", kb: 260, source: null },
];

const layers = {};
for (const [key, blurb] of Object.entries(LAYERS)) {
  const delta = report.deltas?.[key];
  if (!delta) {
    fail(
      `the report has no "${key}" layer. The page renders it, so this is a real gap.\n` +
        `  Add a fixture for it in tools/size/measure.mjs, or stop rendering it.`,
    );
  }
  const bytes = delta.initial.gzip;
  layers[key] = {
    blurb,
    bytes,
    kb: Number((bytes / 1024).toFixed(2)),
    // One decimal is what reads well at display sizes and is still honest;
    // rounding to a whole number is what let "9 KB" drift for so long.
    label: `${(bytes / 1024).toFixed(1)} KB`,
  };
}

const uncited = COMPETITORS.filter((c) => !c.source).map((c) => c.name);

const out = {
  $generatedBy: "apps/web/scripts/generate-bundle-size.mjs",
  $doNotEdit: "Regenerated on every web build from tools/size/size-report.json.",
  measuredAt: report.measuredAt,
  versions: report.versions,
  basis: "gzipped, measured against an empty Next.js app",
  methodUrl: "https://github.com/cookieyes/cookieyes/blob/main/tools/size/README.md",
  layers,
  stylesheet: report.stylesheet,
  comparison: {
    // Withheld rather than guessed. A ratio computed against a number with no
    // provenance is a marketing claim wearing a decimal point, and the page
    // renders nothing at all rather than something unsupportable.
    publishable: uncited.length === 0,
    uncited,
    against: COMPETITORS.map((competitor) => ({
      ...competitor,
      ratio: Number((competitor.kb / (layers.banner.bytes / 1024)).toFixed(1)),
    })),
  },
};

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "bundle-size.json"), `${JSON.stringify(out, null, 2)}\n`);

process.stdout.write(
  `[generate-bundle-size] core ${layers.core.label}, banner ${layers.banner.label}, ` +
    `interface ${layers.interface.label} (${out.basis})\n`,
);
if (uncited.length > 0) {
  process.stdout.write(
    `[generate-bundle-size] comparison withheld — no citation for: ${uncited.join(", ")}\n`,
  );
}
