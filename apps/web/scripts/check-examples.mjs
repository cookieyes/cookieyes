#!/usr/bin/env node
// Type-checks the ts/tsx fences inside an enable-listed set of MDX doc pages against the real,
// built @cookieyes/* SDK types. Compile-only — nothing is rendered or executed.
// See ai-context/designs/getting-started-pages.md §2.5 for the design; §7 for the exact contract.
//
// The pages live in content/shared and are published once per framework
// (scripts/generate-framework-docs.mjs). A body is therefore checked once per framework it
// is published under, after the same two transformations the build applies for that
// framework — <Framework when="…"> blocks resolved, `@cookieyes/nextjs|react` swapped to the
// framework's package (src/lib/remark-framework-docs.ts). A swap that produced code which
// does not compile fails here, not in front of a reader.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const contentDir = join(webRoot, "content", "shared");
const outDir = join(webRoot, ".doc-examples");

// Enable-list. Expand this array to bring more pages under the harness — see design §2.5 for why
// this is a plain array and not a frontmatter flag.
const ENABLED_FILES = [
  "getting-started/installation.mdx",
  "getting-started/quick-start.mdx",
  "getting-started/configuration.mdx",
  "getting-started/which-api.mdx",
  "store/using-the-store.mdx",
  "store/build-your-own-ui.mdx",
  "migration.mdx",
  "hooks/use-consent.mdx",
  "hooks/use-consent-actions.mdx",
  "hooks/use-on-consent-change.mdx",
  "hooks/focused-hooks.mdx",
  "hooks/low-level-hooks.mdx",
  "accessibility.mdx",
  "headless/banner.mdx",
  "headless/preferences.mdx",
  "headless/opt-out.mdx",
  "components/cookie-banner.mdx",
  "components/cookie-preferences.mdx",
  "components/cookie-opt-out.mdx",
  "components/recall-button.mdx",
  "components/gated-script.mdx",
  "components/gated-frame.mdx",
  "components/reload-notice.mdx",
  "troubleshooting.mdx",
  "network-blocking.mdx",
  "styling/overview.mdx",
  "styling/css-variables.mdx",
  "styling/critical-css.mdx",
  "integrations/google-consent-mode.mdx",
  "integrations/ga4.mdx",
  "integrations/google-tag-manager.mdx",
  "integrations/google-ads.mdx",
  "integrations/meta-pixel.mdx",
  "integrations/microsoft-clarity.mdx",
  "integrations/posthog.mdx",
  "integrations/segment.mdx",
  "integrations/custom-integration.mdx",
];

const FENCE_OPEN_RE = /^```(\w+)(.*)$/;
const HEADING_RE = /^#{1,6}\s/;
const ATTR_RE = /(?<name>[a-zA-Z0-9_-]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g;

// ---------------------------------------------------------------------------------------
// Per-framework composition. Mirrors src/lib/framework-docs.ts's composeMarkdown: this is a
// plain script and cannot import the TypeScript module, so the two rules are restated here.
// Keep them identical.
// ---------------------------------------------------------------------------------------

const FRAMEWORKS = ["nextjs", "react", "core"];
const SWAPPABLE = /@cookieyes\/(react|nextjs)(\/styles\.css|\/critical\.css)?(?![\w/-])/g;
const OPT_OUT = /(^|\s)frameworkSwap=false(\s|$)/;
const USE_CLIENT = /^"use client";\n\n?/;
const APP_DIR_TITLE = /title="app\//;
const BLOCK = /<Framework when="([^"]*)">\s*\n((?:(?!<Framework)[\s\S])*?)\n\s*<\/Framework>\n?/g;
const FENCE = /^(```[^\n]*)\n([\s\S]*?)^```[ \t]*$/gm;

function frameworksOf(source, relFile) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(source);
  const line = fm?.[1].split(/\r?\n/).find((l) => l.startsWith("frameworks:"));
  const inner = line && /\[(.*)\]/.exec(line);
  if (!inner) throw new Error(`[check-examples] ${relFile}: frontmatter has no frameworks: [...]`);
  return inner[1]
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function composeFor(source, framework) {
  // Innermost blocks first, repeated until none remain — blocks nest.
  let out = source;
  for (;;) {
    const next = out.replace(BLOCK, (_m, when, inner) =>
      when.split(/\s+/).includes(framework) ? `${inner}\n` : "",
    );
    if (next === out) break;
    out = next;
  }
  out = out.replace(FENCE, (_m, opener, code) => {
    let swapped = code;
    if (framework !== "core" && !OPT_OUT.test(opener)) {
      swapped = swapped.replace(
        SWAPPABLE,
        (_s, _pkg, suffix) => `@cookieyes/${framework}${suffix ?? ""}`,
      );
    }
    let head = opener;
    if (framework !== "nextjs") {
      swapped = swapped.replace(USE_CLIENT, "");
      head = head.replace(APP_DIR_TITLE, 'title="src/');
    }
    return `${head}\n${swapped}\`\`\``;
  });
  return out;
}

// ---------------------------------------------------------------------------------------

function parseMeta(meta) {
  const attrs = {};
  for (const m of meta.matchAll(ATTR_RE)) attrs[m.groups.name] = m[2] ?? m[3] ?? true;
  return attrs;
}

function extractGroups(mdxSource) {
  const lines = mdxSource.split("\n");
  const groups = [];
  let currentGroup = null;
  let sectionId = 0;
  let inFence = false;
  let fenceLang = "";
  let fenceMeta = {};
  let fenceBuf = [];
  let fenceStartLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFence && HEADING_RE.test(line)) {
      sectionId++;
      currentGroup = null;
      continue;
    }
    const open = !inFence && FENCE_OPEN_RE.exec(line);
    if (open) {
      inFence = true;
      fenceLang = open[1];
      fenceMeta = parseMeta(open[2]);
      fenceBuf = [];
      fenceStartLine = i + 1;
      continue;
    }
    if (inFence && line.trim() === "```") {
      inFence = false;
      const isTs = fenceLang === "ts" || fenceLang === "tsx";
      const skipped = fenceMeta.check === "false";
      if (isTs && !skipped) {
        // Fences under one heading compile together, so they can import each other. A
        // fence with group="name" joins that named group instead, for a walkthrough whose
        // files sit under separate step headings.
        const named = typeof fenceMeta.group === "string" ? fenceMeta.group : null;
        if (named) {
          currentGroup = groups.find((g) => g.name === named) ?? null;
          if (!currentGroup) {
            currentGroup = { sectionId, name: named, files: [] };
            groups.push(currentGroup);
          }
        } else if (!currentGroup || currentGroup.sectionId !== sectionId || currentGroup.name) {
          currentGroup = { sectionId, files: [] };
          groups.push(currentGroup);
        }
        const relPath =
          typeof fenceMeta.title === "string"
            ? fenceMeta.title
            : `example-${fenceStartLine}.${fenceLang}`;
        currentGroup.files.push({ relPath, content: fenceBuf.join("\n"), line: fenceStartLine });
      }
      continue;
    }
    if (inFence) fenceBuf.push(line);
  }
  return groups;
}

/**
 * A fence's `title=` becomes the on-disk filename for that example, so it is attacker-controlled
 * in the same sense any committed content is. `join()` happily resolves `../` out of the output
 * directory, which would let a title like `../../../src/app/page.tsx` overwrite real source when
 * the harness runs. Contain it: resolve the path and require it to stay under `groupDir`.
 */
function resolveContained(groupDir, relPath, relFile, line) {
  const target = resolve(groupDir, relPath);
  const rel = relative(groupDir, target);
  if (rel === "" || rel === ".." || rel.startsWith(`..${sep}`)) {
    throw new Error(
      `[check-examples] ${relFile}:${line} — fence title ${JSON.stringify(relPath)} resolves ` +
        `outside the example directory. Titles must be relative paths inside the example, ` +
        `e.g. "app/layout.tsx".`,
    );
  }
  return target;
}

function writeBaseTsconfig() {
  const base = {
    compilerOptions: {
      target: "ESNext",
      lib: ["dom", "dom.iterable", "esnext"],
      jsx: "react-jsx",
      module: "esnext",
      moduleResolution: "bundler",
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      isolatedModules: true,
      resolveJsonModule: true,
      // Pulls in next/types/global.d.ts (declare module '*.css' {}) — see design §2.5.
      types: ["next"],
    },
  };
  const path = join(outDir, "tsconfig.base.json");
  writeFileSync(path, JSON.stringify(base, null, 2));
  return path;
}

function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const baseTsconfigPath = writeBaseTsconfig();

  let checkedFiles = 0;
  let checkedVariants = 0;
  let skippedFences = 0;
  let failed = false;

  for (const relFile of ENABLED_FILES) {
    const absFile = join(contentDir, relFile);
    // A page can be enable-listed before it exists (the list is written against the
    // design's page plan). That is not an error in the harness: the missing page is
    // skipped with a clear warning rather than crashing the whole run. Once
    // the page lands it is picked up automatically on the next run.
    if (!existsSync(absFile)) {
      console.warn(`[check-examples] WARNING: skipping "${relFile}" — file does not exist yet.`);
      continue;
    }
    const source = readFileSync(absFile, "utf8");
    skippedFences += (source.match(/check="false"/g) ?? []).length;

    const frameworks = frameworksOf(source, relFile).filter((fw) => FRAMEWORKS.includes(fw));
    for (const framework of frameworks) {
      const groups = extractGroups(composeFor(source, framework));
      const variantId = `${relFile.replace(/[\\/]/g, "__")}__${framework}`;

      groups.forEach((group, idx) => {
        const groupDir = join(outDir, variantId, `group-${idx}`);
        mkdirSync(groupDir, { recursive: true });
        for (const f of group.files) {
          const target = resolveContained(groupDir, f.relPath, relFile, f.line);
          mkdirSync(dirname(target), { recursive: true });
          writeFileSync(target, f.content);
        }

        // Some examples import the reader's own tooling rather than ours: a
        // design-system component (conventionally `@/components/ui/*`) in the
        // `asChild` demos, or a test runner in the end-to-end ones. Those belong to
        // the reader and cannot resolve here, but the examples are still worth
        // checking for their CookieYes usage. Ambient declarations type only those
        // imports as `any`, so the rest of each file is checked for real.
        // The test-runner stub carries just enough of a signature that destructured
        // fixtures (`{ page }`) are contextually typed rather than implicitly `any`,
        // which `strict` would otherwise reject.
        writeFileSync(
          join(groupDir, "reader-tooling.d.ts"),
          [
            'declare module "@/*";',
            'declare module "@playwright/test" {',
            "  type Fixtures = Record<string, any>;",
            "  export const test: (name: string, fn: (fixtures: Fixtures) => unknown) => void;",
            "  export const expect: (actual: unknown) => Record<string, any>;",
            "}",
            "",
          ].join("\n"),
        );
        writeFileSync(
          join(groupDir, "tsconfig.json"),
          JSON.stringify({ extends: baseTsconfigPath, include: ["**/*"] }, null, 2),
        );

        try {
          execFileSync("pnpm", ["exec", "tsc", "--noEmit", "-p", groupDir], {
            cwd: webRoot,
            stdio: ["ignore", "pipe", "pipe"],
          });
        } catch (error) {
          failed = true;
          process.stderr.write(String(error.stdout ?? ""));
          process.stderr.write(
            `\n[check-examples] FAILED: ${relFile} as ${framework} (heading group ${group.sectionId}) — ` +
              `${group.files.map((f) => f.relPath).join(", ")}\n`,
          );
        }
      });
      checkedVariants++;
    }
    checkedFiles++;
  }

  console.log(
    `[check-examples] checked ${checkedFiles} page(s) as ${checkedVariants} framework variant(s), ` +
      `skipped ${skippedFences} opted-out fence(s).`,
  );
  if (failed) {
    console.error("[check-examples] one or more examples failed to type-check.");
    process.exit(1);
  }
}

main();
