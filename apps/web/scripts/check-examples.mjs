#!/usr/bin/env node
// Type-checks the ts/tsx fences inside an enable-listed set of MDX doc pages against the real,
// built @cookieyes/* SDK types. Compile-only — nothing is rendered or executed.
// See ai-context/designs/getting-started-pages.md §2.5 for the design; §7 for the exact contract.
//
// The pages live in content/shared and are published once per framework
// (scripts/generate-framework-docs.mjs). A body is therefore checked once per framework it
// is published under, after the same two transformations the build applies for that
// framework — <Framework when="…"> blocks resolved, `@cookieyes/nextjs|react` swapped to the
// framework's package (src/lib/remark-framework-docs.ts). A Vue, Nuxt or Svelte page is never
// swapped, and fails here if a React fence (or, on a Svelte page, a Vue one) is left in it. A
// swap that produced code which
// does not compile fails here, not in front of a reader.
//
// Usage: node scripts/check-examples.mjs [--framework <name>]... [<page under content/shared>]...
// With no arguments every enabled page and every skill is checked. Naming frameworks or pages
// checks only those, in a folder of its own, so several partial runs can work at once.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const contentDir = join(webRoot, "content", "shared");
const outDir = join(webRoot, ".doc-examples");
const { onlyFrameworks, onlyPages } = parseArgs(process.argv.slice(2));
const partial = onlyFrameworks.length > 0 || onlyPages.length > 0;
const runDir = partial ? join(outDir, `run-${process.pid}`) : outDir;
// The customer skills in the repository's root `skills/` folder. They are checked too, all of
// them and without an enable-list: an AI assistant copies a skill's code as written, so a
// skill that stops compiling after an API change must fail the build, not ship.
const skillsDir = join(webRoot, "..", "..", "skills");

// Enable-list. Expand this array to bring more pages under the harness — see design §2.5 for why
// this is a plain array and not a frontmatter flag.
const ENABLED_FILES = [
  "getting-started/installation.mdx",
  "getting-started/quick-start.mdx",
  "getting-started/configuration.mdx",
  "getting-started/self-hosted.mdx",
  "getting-started/which-api.mdx",
  "getting-started/vanilla.mdx",
  "self-host/quickstart.mdx",
  "self-host/databases.mdx",
  "self-host/mounting.mdx",
  "self-host/retention.mdx",
  "self-host/data-requests.mdx",
  "self-host/api-reference.mdx",
  "self-host/compatible-backends.mdx",
  "store/using-the-store.mdx",
  "store/build-your-own-ui.mdx",
  "store/build-an-adapter.mdx",
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
  "embeds.mdx",
  "styling/overview.mdx",
  "styling/css-variables.mdx",
  "styling/critical-css.mdx",
  "styling/tailwind.mdx",
  "styling/color-scheme.mdx",
  "styling/theme-tokens.mdx",
  "integrations/google-consent-mode.mdx",
  "integrations/ahrefs-analytics.mdx",
  "integrations/ga4.mdx",
  "integrations/google-tag-manager.mdx",
  "integrations/google-ads.mdx",
  "integrations/hotjar.mdx",
  "integrations/matomo.mdx",
  "integrations/microsoft-uet.mdx",
  "integrations/tiktok-pixel.mdx",
  "integrations/youtube.mdx",
  "integrations/mixpanel.mdx",
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

const FRAMEWORKS = ["nextjs", "react", "vue", "nuxt", "svelte", "core"];
const SWAPPABLE = /@cookieyes\/(react|nextjs)(\/styles\.css|\/critical\.css)?(?![\w/-])/g;
const OPT_OUT = /(^|\s)frameworkSwap=false(\s|$)/;
const USE_CLIENT = /^"use client";\n\n?/;
const APP_DIR_TITLE = /title="app\//;
// Kept identical to VUE_FORBIDDEN in src/lib/framework-docs.ts; a test compares the two.
const VUE_FORBIDDEN = /@cookieyes\/(react|nextjs)(?![\w-])|"use client"|useSyncExternalStore/;
// Kept identical to SVELTE_FORBIDDEN in src/lib/framework-docs.ts; a test compares the two.
const SVELTE_FORBIDDEN =
  /@cookieyes\/(react|nextjs|vue|nuxt)(?![\w-])|"use client"|useSyncExternalStore/;
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
    const handWritten = framework === "vue" || framework === "nuxt" || framework === "svelte";
    const lang = /^```(\w*)/.exec(opener)?.[1];
    if (framework === "svelte") {
      if (lang === "tsx" || lang === "vue" || SVELTE_FORBIDDEN.test(code)) {
        throw new Error(
          `[check-examples] a Svelte page has a React or Vue fence (tsx, vue, a @cookieyes/react, ` +
            `@cookieyes/nextjs, @cookieyes/vue or @cookieyes/nuxt import, a "use client" line or ` +
            `useSyncExternalStore). Wrap it in <Framework when="...">:\n` +
            code.split("\n").slice(0, 3).join("\n"),
        );
      }
    } else if (handWritten) {
      if (lang === "tsx" || VUE_FORBIDDEN.test(code)) {
        throw new Error(
          `[check-examples] a ${framework === "vue" ? "Vue" : "Nuxt"} page has a React fence (tsx, a @cookieyes/react or ` +
            `@cookieyes/nextjs import, a "use client" line or useSyncExternalStore). Wrap it in ` +
            `<Framework when="nextjs react">:\n${code.split("\n").slice(0, 3).join("\n")}`,
        );
      }
    }
    if (framework !== "core" && !handWritten && !OPT_OUT.test(opener)) {
      swapped = swapped.replace(
        SWAPPABLE,
        (_s, _pkg, suffix) => `@cookieyes/${framework}${suffix ?? ""}`,
      );
    }
    let head = opener;
    if (framework !== "nextjs" && framework !== "nuxt") {
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

/**
 * Splits a composed page into the groups of files that compile together. `componentLang` adds
 * the fences of that language (`vue` on Vue and Nuxt pages, `svelte` on Svelte pages).
 * `untitledDir` is where a fence without a title is written: a Nuxt file must sit in the app's
 * source folder to get its auto-imports.
 */
function extractGroups(mdxSource, componentLang = null, untitledDir = "") {
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
      // `vue` and `svelte` fences are single-file components. They join the groups of their own
      // variants only, where vue-tsc or svelte-check compiles them next to the `ts` fences that
      // import them.
      const isTs =
        fenceLang === "ts" ||
        fenceLang === "tsx" ||
        (componentLang !== null && fenceLang === componentLang);
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
            : `${untitledDir}example-${fenceStartLine}.${fenceLang}`;
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

/**
 * The Vue variant's compiler settings: no Next types, and JSX left to Vue. Unlike the
 * React base, nothing here declares `*.css`; the harness adds that to each group (see
 * checkVariant) because the stylesheet import is the reader's bundler's job, not the SDK's.
 */
function writeVueTsconfig() {
  const base = {
    compilerOptions: {
      target: "ESNext",
      lib: ["dom", "dom.iterable", "esnext"],
      jsx: "preserve",
      module: "esnext",
      moduleResolution: "bundler",
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      isolatedModules: true,
      resolveJsonModule: true,
      types: ["node"],
    },
  };
  const path = join(runDir, "tsconfig.vue.json");
  writeFileSync(path, JSON.stringify(base, null, 2));
  return path;
}

/**
 * The Svelte variant's compiler settings: no Next types and no JSX. `verbatimModuleSyntax` is on,
 * as in a new Svelte project, so an example that imports a type without `import type` fails
 * here and not in the reader's editor. As for Vue, `*.css` is declared per group by the harness.
 */
function writeSvelteTsconfig() {
  const base = {
    compilerOptions: {
      target: "ESNext",
      lib: ["dom", "dom.iterable", "esnext"],
      module: "esnext",
      moduleResolution: "bundler",
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      forceConsistentCasingInFileNames: true,
      skipLibCheck: true,
      isolatedModules: true,
      verbatimModuleSyntax: true,
      resolveJsonModule: true,
      types: ["node"],
    },
  };
  const path = join(runDir, "tsconfig.svelte.json");
  writeFileSync(path, JSON.stringify(base, null, 2));
  return path;
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
  const path = join(runDir, "tsconfig.base.json");
  writeFileSync(path, JSON.stringify(base, null, 2));
  return path;
}

// Some examples import the reader's own tooling rather than ours: a
// design-system component (conventionally `@/components/ui/*`) in the
// `asChild` demos, a test runner in the end-to-end ones, or Testing Library in
// the `test-consent` skill. Those belong to the reader and cannot resolve
// here, but the examples are still worth checking for their CookieYes usage.
// Ambient declarations type only those imports as `any`, so the rest of each
// file is checked for real.
// The test-runner stub carries just enough of a signature that destructured
// fixtures (`{ page }`) are contextually typed rather than implicitly `any`,
// which `strict` would otherwise reject.
// The Self-host pages mount `@cookieyes/backend` in the reader's own server and
// database client; those, and the Bun and Deno globals, are stubbed the same way.
const READER_TOOLING = [
  'declare module "@/*";',
  'declare module "@testing-library/react";',
  'declare module "@playwright/test" {',
  "  type Fixtures = Record<string, any>;",
  "  export const test: (name: string, fn: (fixtures: Fixtures) => unknown) => void;",
  "  export const expect: (actual: unknown) => Record<string, any>;",
  "}",
  'declare module "pg";',
  'declare module "postgres";',
  'declare module "@neondatabase/serverless";',
  'declare module "better-sqlite3";',
  'declare module "express";',
  'declare module "fastify" {',
  "  export type FastifyRequest = any;",
  "  export type FastifyReply = any;",
  "  const Fastify: any;",
  "  export default Fastify;",
  "}",
  'declare module "hono" {',
  "  export type Context = any;",
  "  export const Hono: any;",
  "}",
  'declare module "bun:sqlite";',
  'declare module "vitest";',
  "declare const Bun: { serve(options: { fetch: (request: Request) => Promise<Response> }): unknown };",
  "declare const Deno: { serve(handler: (request: Request) => Promise<Response>): unknown };",
  "",
].join("\n");

function reportFailure(error, relFile, variant, group) {
  process.stderr.write(String(error.stdout ?? ""));
  process.stderr.write(
    `\n[check-examples] FAILED: ${relFile} as ${variant} (heading group ${group.sectionId}) — ` +
      `${group.files.map((f) => f.relPath).join(", ")}\n`,
  );
}

/**
 * Type-checks every fence group of one composed source. Returns false when any group fails;
 * the compiler output is already written to stderr by then.
 */
function checkVariant(relFile, variant, source, baseTsconfigPath) {
  const variantId = `${relFile.replace(/[\\/]/g, "__")}__${variant}`;
  const isVue = variant === "vue";
  const isSvelte = variant === "svelte";
  let ok = true;
  extractGroups(source, isVue ? "vue" : isSvelte ? "svelte" : null).forEach((group, idx) => {
    const groupDir = join(runDir, variantId, `group-${idx}`);
    mkdirSync(groupDir, { recursive: true });
    for (const f of group.files) {
      const target = resolveContained(groupDir, f.relPath, relFile, f.line);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content);
    }

    writeFileSync(join(groupDir, "reader-tooling.d.ts"), READER_TOOLING);
    // The stylesheet import (`@cookieyes/vue/styles.css`) is resolved by the reader's bundler.
    // Next's own types declare `*.css` for the other variants; the Vue and Svelte variants need
    // it said here, and only here, so the user-facing example stays exactly what a reader writes.
    if (isVue || isSvelte) {
      writeFileSync(join(groupDir, "harness-env.d.ts"), 'declare module "*.css";\n');
    }
    writeFileSync(
      join(groupDir, "tsconfig.json"),
      JSON.stringify(
        {
          extends: baseTsconfigPath,
          // A bare `**/*` leaves `.vue` and `.svelte` files out of the program.
          include: isVue
            ? ["**/*.ts", "**/*.vue"]
            : isSvelte
              ? ["**/*.ts", "**/*.svelte"]
              : ["**/*"],
        },
        null,
        2,
      ),
    );

    // svelte-check compiles `.svelte` files and the `.ts` files next to them in one program,
    // as vue-tsc does for `.vue` files. Warnings (accessibility hints) do not fail the check.
    const command = isSvelte
      ? ["svelte-check", "--workspace", groupDir, "--tsconfig", join(groupDir, "tsconfig.json")]
      : [isVue ? "vue-tsc" : "tsc", "--noEmit", "-p", groupDir];
    try {
      execFileSync("pnpm", ["exec", ...command], {
        cwd: webRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      ok = false;
      reportFailure(error, relFile, variant, group);
    }
  });
  return ok;
}

// ---------------------------------------------------------------------------------------
// Nuxt. A Nuxt example has no imports: `defineNuxtConfig`, `defineAppConfig`, the composables
// and the components are auto-imported, and the `cookieyes` keys of nuxt.config.ts and
// app.config.ts are typed by the module. A plain vue-tsc program knows none of that, so the
// Nuxt variant is checked inside a real Nuxt app that installs @cookieyes/nuxt. Its types are
// generated once with `nuxi prepare`; each group's files are then written into the app under
// their titles (a fence titled `nuxt.config.ts` or `app/app.config.ts` is checked as that file)
// and vue-tsc runs on the app's own project references, as `nuxi typecheck` does.
// ---------------------------------------------------------------------------------------

const NUXT_DEFAULT_CONFIG = 'export default defineNuxtConfig({ modules: ["@cookieyes/nuxt"] });\n';
/** What `nuxi prepare` and the harness own. Everything else in the app is one group's files. */
const NUXT_KEEP = new Set([".nuxt", "node_modules", "package.json", "tsconfig.json"]);

let nuxtHarness = null;

function prepareNuxtHarness() {
  const dir = join(runDir, "nuxt-app");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "package.json"), '{ "private": true, "type": "module" }\n');
  writeFileSync(join(dir, "nuxt.config.ts"), NUXT_DEFAULT_CONFIG);
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify(
      {
        files: [],
        references: ["app", "server", "shared", "node"].map((name) => ({
          path: `./.nuxt/tsconfig.${name}.json`,
        })),
      },
      null,
      2,
    ),
  );
  execFileSync("pnpm", ["exec", "nuxi", "prepare", dir], {
    cwd: webRoot,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return dir;
}

function checkNuxtVariant(relFile, source) {
  nuxtHarness ??= prepareNuxtHarness();
  const appDir = nuxtHarness;
  let ok = true;
  for (const group of extractGroups(source, "vue", "app/")) {
    for (const entry of readdirSync(appDir)) {
      if (!NUXT_KEEP.has(entry)) rmSync(join(appDir, entry), { recursive: true, force: true });
    }
    writeFileSync(join(appDir, "nuxt.config.ts"), NUXT_DEFAULT_CONFIG);
    // In `shared/`, the one folder Nuxt's app, server and shared tsconfigs all include, so the
    // stubs reach a server route as well as a component.
    mkdirSync(join(appDir, "shared"), { recursive: true });
    writeFileSync(join(appDir, "shared", "reader-tooling.d.ts"), READER_TOOLING);
    for (const f of group.files) {
      const target = resolveContained(appDir, f.relPath, relFile, f.line);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, f.content);
    }
    try {
      // `--force`: every group reuses the same project, so nothing may count as up to date.
      execFileSync("pnpm", ["exec", "vue-tsc", "-b", appDir, "--force", "--noEmit"], {
        cwd: webRoot,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (error) {
      ok = false;
      reportFailure(error, relFile, "nuxt", group);
    }
  }
  return ok;
}

function parseArgs(args) {
  const onlyFrameworks = [];
  const onlyPages = [];
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--framework") onlyFrameworks.push(args[++i]);
    else if (arg.startsWith("--framework=")) onlyFrameworks.push(arg.slice("--framework=".length));
    else onlyPages.push(arg.replace(/^content\/shared\//, ""));
  }
  return { onlyFrameworks, onlyPages };
}

function main() {
  for (const fw of onlyFrameworks) {
    if (!FRAMEWORKS.includes(fw)) throw new Error(`[check-examples] unknown framework "${fw}"`);
  }
  for (const page of onlyPages) {
    if (!ENABLED_FILES.includes(page)) {
      throw new Error(`[check-examples] "${page}" is not in ENABLED_FILES`);
    }
  }
  rmSync(runDir, { recursive: true, force: true });
  mkdirSync(runDir, { recursive: true });
  const reactTsconfigPath = writeBaseTsconfig();
  const vueTsconfigPath = writeVueTsconfig();
  const svelteTsconfigPath = writeSvelteTsconfig();

  let checkedFiles = 0;
  let checkedVariants = 0;
  let checkedSkills = 0;
  let skippedFences = 0;
  let failed = false;

  for (const relFile of ENABLED_FILES) {
    if (onlyPages.length > 0 && !onlyPages.includes(relFile)) continue;
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

    const frameworks = frameworksOf(source, relFile).filter(
      (fw) =>
        FRAMEWORKS.includes(fw) && (onlyFrameworks.length === 0 || onlyFrameworks.includes(fw)),
    );
    for (const framework of frameworks) {
      const composed = composeFor(source, framework);
      const ok =
        framework === "nuxt"
          ? checkNuxtVariant(relFile, composed)
          : checkVariant(
              relFile,
              framework,
              composed,
              framework === "vue"
                ? vueTsconfigPath
                : framework === "svelte"
                  ? svelteTsconfigPath
                  : reactTsconfigPath,
            );
      if (!ok) failed = true;
      checkedVariants++;
    }
    checkedFiles++;
  }

  // Skills are plain Markdown: no frontmatter frameworks and no <Framework> blocks, so each
  // is checked once, exactly as an assistant reads it. A partial run leaves them out.
  for (const skill of partial ? [] : readdirSync(skillsDir).sort()) {
    const absFile = join(skillsDir, skill, "SKILL.md");
    if (!existsSync(absFile)) continue;
    const relFile = `skills/${skill}/SKILL.md`;
    const source = readFileSync(absFile, "utf8");
    skippedFences += (source.match(/check="false"/g) ?? []).length;
    if (!checkVariant(relFile, "skill", source, reactTsconfigPath)) failed = true;
    checkedSkills++;
  }

  console.log(
    `[check-examples] checked ${checkedFiles} page(s) as ${checkedVariants} framework variant(s) ` +
      `and ${checkedSkills} skill(s), skipped ${skippedFences} opted-out fence(s).`,
  );
  if (failed) {
    console.error("[check-examples] one or more examples failed to type-check.");
    process.exit(1);
  }
}

main();
