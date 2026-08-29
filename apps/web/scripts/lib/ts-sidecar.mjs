// Shared helper for both `generate-config-reference.mjs` and
// `generate-component-reference.mjs`: a hand-maintained sidecar is a `.ts`
// module (type-checked by `tsc` against its own exported shape during
// `pnpm typecheck`), but the generator scripts run as plain Node ESM with no
// TS loader. Transpile it (no type-checking — that's `typecheck`'s job) and
// import the resulting JS from a scratch file so the caller gets the plain
// data array back out — the same "write then import" pattern
// `check-examples.mjs` uses for its own scratch output.
//
// Extracted from `generate-config-reference.mjs`'s original `loadSidecarEntries`
// — see ai-context/designs/component-reference-docs.md §2.1. Behaviour is
// unchanged for that caller; only the scratch file's location moved (from
// `apps/web/.generated/_sidecar.mjs` to a per-file scratch path under the OS
// temp dir), since this helper has no notion of a caller-specific output
// directory and must be safe to call from more than one generator.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * Transpiles the `.ts` sidecar at `sidecarPath` and returns its named export
 * `exportName` (the plain data array, e.g. `configSidecarEntries` or
 * `componentSidecarEntries`).
 */
export async function loadTsSidecarModule(sidecarPath, exportName) {
  const source = readFileSync(sidecarPath, "utf-8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
    },
    fileName: sidecarPath,
  });
  // The only import in any sidecar today is a type-only import of its own
  // entry-shape type, which `transpileModule` (no type info available)
  // cannot elide on its own — strip it by hand.
  const withoutImports = outputText.replace(/^import\s+type\s.*$/gm, "");

  const scratchDir = join(tmpdir(), "cookieyes-web-ts-sidecar");
  mkdirSync(scratchDir, { recursive: true });
  const scratchPath = join(scratchDir, `${basename(sidecarPath, ".ts")}.mjs`);
  writeFileSync(scratchPath, withoutImports);

  const mod = await import(pathToFileURL(scratchPath).href);
  return mod[exportName];
}
