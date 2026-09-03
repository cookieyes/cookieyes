#!/usr/bin/env node
// Type-checks the ts/tsx fences inside an enable-listed set of MDX doc pages against the real,
// built @cookieyes/* SDK types. Compile-only — nothing is rendered or executed.
// See ai-context/designs/getting-started-pages.md §2.5 for the design; §7 for the exact contract.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const contentDir = join(webRoot, "content", "docs");
const outDir = join(webRoot, ".doc-examples");

// Enable-list. Expand this array to bring more pages under the harness — see design §2.5 for why
// this is a plain array and not a frontmatter flag.
const ENABLED_FILES = [
  "getting-started/installation.mdx",
  "getting-started/quick-start.mdx",
  "getting-started/configuration.mdx",
  "getting-started/which-api.mdx",
  "migration.mdx",
  "hooks/use-consent.mdx",
  "hooks/use-consent-actions.mdx",
  "hooks/use-on-consent-change.mdx",
  "hooks/focused-hooks.mdx",
  "hooks/low-level-hooks.mdx",
  "accessibility.mdx",
  "headless/overview.mdx",
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
  "reopening-preferences.mdx",
  "network-blocking.mdx",
  "styling/overview.mdx",
  "styling/css-variables.mdx",
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
        if (!currentGroup || currentGroup.sectionId !== sectionId) {
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
  let skippedFences = 0;
  let failed = false;

  for (const relFile of ENABLED_FILES) {
    const absFile = join(contentDir, relFile);
    // Robustness, not a weakening of the check: an enable-listed page that
    // hasn't landed yet (e.g. authored by a different in-flight change) is
    // skipped with a clear warning rather than crashing the whole run. Once
    // the file exists, it is checked for real like everything else here.
    if (!existsSync(absFile)) {
      console.warn(`[check-examples] WARNING: skipping "${relFile}" — file does not exist yet.`);
      continue;
    }
    const source = readFileSync(absFile, "utf-8");
    skippedFences += (source.match(/check="false"/g) ?? []).length;
    const groups = extractGroups(source);

    groups.forEach((group, idx) => {
      const groupDir = join(outDir, relFile.replace(/[\\/]/g, "__"), `group-${idx}`);
      mkdirSync(groupDir, { recursive: true });
      for (const f of group.files) {
        const target = resolveContained(groupDir, f.relPath, relFile, f.line);
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, f.content);
        checkedFiles++;
      }
      // Examples that demonstrate `asChild` import the reader's own design-system
      // component, conventionally `@/components/ui/*`. That path is theirs, not
      // ours, and cannot resolve here — but the example is still worth checking
      // for its CookieYes usage. A wildcard ambient module types those imports as
      // `any` so the rest of the file is checked for real.
      writeFileSync(join(groupDir, "ds-placeholders.d.ts"), 'declare module "@/*";\n');
      writeFileSync(
        join(groupDir, "tsconfig.json"),
        JSON.stringify({ extends: baseTsconfigPath, include: ["**/*"] }, null, 2),
      );

      try {
        execFileSync("pnpm", ["exec", "tsc", "--noEmit", "-p", groupDir], {
          cwd: webRoot,
          stdio: "inherit",
        });
      } catch {
        failed = true;
        console.error(
          `\n[check-examples] FAILED: ${relFile} (heading group ${group.sectionId}) — ` +
            `${group.files.map((f) => f.relPath).join(", ")}\n`,
        );
      }
    });
  }

  console.log(
    `[check-examples] checked ${checkedFiles} file(s), skipped ${skippedFences} opted-out fence(s).`,
  );
  if (failed) {
    console.error("[check-examples] one or more examples failed to type-check.");
    process.exit(1);
  }
}

main();
