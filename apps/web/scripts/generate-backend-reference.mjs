#!/usr/bin/env node
// Builds the `@cookieyes/backend` reference the Self-host pages render.
//
// Reads  `sdk/backend/src/handler.ts` (option names and types, via the TypeScript compiler)
//        `content/shared/self-host/backend-options.sidecar.ts` (option prose)
//        `sdk/backend/openapi.json` (endpoints and fields; a test in that package keeps it
//        equal to the source)
// Writes `apps/web/.generated/backend-reference.json`
//
// Fails closed (exit 1) when:
//   1. `ConsentBackendOptions` cannot be found
//   2. an option has no sidecar entry (undocumented)
//   3. a sidecar entry has no option (stale)
//   4. a sidecar entry states a default without saying where it is applied
//   5. openapi.json is missing or describes no endpoints or fields

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { loadTsSidecarModule } from "./lib/ts-sidecar.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const webRoot = join(here, "..");
const backendRoot = join(webRoot, "..", "..", "sdk", "backend");
const handlerFile = join(backendRoot, "src", "handler.ts");
const openapiFile = join(backendRoot, "openapi.json");
const sidecarPath = join(webRoot, "content", "shared", "self-host", "backend-options.sidecar.ts");
const outDir = join(webRoot, ".generated");

function fail(message) {
  console.error(`[generate-backend-reference] ${message}`);
  process.exit(1);
}

// ── Options, from the compiler ─────────────────────────────────────────────
const program = ts.createProgram([handlerFile], {
  strict: true,
  exactOptionalPropertyTypes: true,
  target: ts.ScriptTarget.ES2020,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  module: ts.ModuleKind.ESNext,
  lib: ["lib.es2020.d.ts", "lib.dom.d.ts"],
});
const checker = program.getTypeChecker();
const source = program.getSourceFile(handlerFile);
let optionsNode;
ts.forEachChild(source, (node) => {
  if (ts.isTypeAliasDeclaration(node) && node.name.text === "ConsentBackendOptions") {
    optionsNode = node;
  }
});
if (!optionsNode) fail("ConsentBackendOptions was not found in sdk/backend/src/handler.ts.");

const typeText = (type) => checker.typeToString(type).replace(/\s*\|\s*undefined$/, "");

/** Every option, and the fields of an option whose value can be an object. */
const extracted = new Map();
for (const symbol of checker.getPropertiesOfType(checker.getTypeAtLocation(optionsNode.name))) {
  const type = checker.getTypeOfSymbolAtLocation(symbol, optionsNode);
  const required = !(symbol.flags & ts.SymbolFlags.Optional);
  // Only an inline `{ ... }` is expanded into its fields; a named type such as
  // `ConsentStore`, or an array, is documented as one option.
  const literal = (type.isUnion() ? type.types : [type]).find(
    (t) =>
      (t.symbol?.flags ?? 0) & ts.SymbolFlags.TypeLiteral &&
      checker.getSignaturesOfType(t, ts.SignatureKind.Call).length === 0,
  );
  const canBeFalse =
    type.isUnion() && type.types.some((t) => t.flags & ts.TypeFlags.BooleanLiteral);
  extracted.set(symbol.name, {
    type: literal ? (canBeFalse ? "false | object" : "object") : typeText(type),
    required,
  });
  if (!literal) continue;
  for (const field of checker.getPropertiesOfType(literal)) {
    extracted.set(`${symbol.name}.${field.name}`, {
      type: typeText(checker.getTypeOfSymbolAtLocation(field, optionsNode)),
      required: !(field.flags & ts.SymbolFlags.Optional),
    });
  }
}

const sidecar = await loadTsSidecarModule(sidecarPath, "backendOptionSidecarEntries");
const documented = new Set(sidecar.map((e) => e.path));
const undocumented = [...extracted.keys()].filter((path) => !documented.has(path));
if (undocumented.length > 0) {
  fail(`option(s) with no entry in backend-options.sidecar.ts: ${undocumented.join(", ")}.`);
}
const stale = sidecar.filter((e) => !extracted.has(e.path)).map((e) => e.path);
if (stale.length > 0) {
  fail(`sidecar entr(ies) with no matching option in ConsentBackendOptions: ${stale.join(", ")}.`);
}
const unlocated = sidecar.filter(
  (e) =>
    e.default !== null &&
    e.defaultLocation === null &&
    !e.path.includes(".") &&
    e.path !== "ipAddress",
);
if (unlocated.length > 0) {
  fail(`a default needs a defaultLocation: ${unlocated.map((e) => e.path).join(", ")}.`);
}
const options = sidecar.map((entry) => ({ ...entry, ...extracted.get(entry.path) }));

// ── Endpoints and fields, from the committed contract ───────────────────────
if (!existsSync(openapiFile)) fail("sdk/backend/openapi.json is missing.");
const openapi = JSON.parse(readFileSync(openapiFile, "utf8"));

const endpoints = Object.entries(openapi.paths ?? {}).flatMap(([path, methods]) =>
  Object.entries(methods).map(([method, op]) => ({
    method: method.toUpperCase(),
    path,
    access: op.security ? "Owner key" : "Public",
    summary: op.summary ?? "",
    description: op.description ?? "",
  })),
);

function fieldType(schema) {
  if (schema.enum) return schema.enum.map((v) => `"${v}"`).join(" | ");
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  return types
    .map((t) => (t === "array" ? "string[]" : t === "object" ? "Record<string, boolean>" : t))
    .join(" | ");
}

function fields(name) {
  const schema = openapi.components?.schemas?.[name];
  if (!schema?.properties) fail(`openapi.json has no ${name} schema.`);
  const required = new Set(schema.required ?? []);
  return Object.entries(schema.properties).map(([field, s]) => ({
    name: field,
    type: fieldType(s),
    required: required.has(field),
    personalData: s["x-personal-data"] ?? "no",
    description: s.description ?? "",
  }));
}

const data = {
  contract: openapi.info?.version ?? "",
  options,
  endpoints,
  payload: fields("ConsentPayload"),
  record: fields("StoredRecord"),
};
if (data.endpoints.length === 0 || data.payload.length === 0) {
  fail("openapi.json describes no endpoints or no payload fields.");
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "backend-reference.json"), `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `[generate-backend-reference] ${options.length} options, ${endpoints.length} endpoints, ` +
    `${data.payload.length} payload fields, ${data.record.length} stored columns.`,
);
