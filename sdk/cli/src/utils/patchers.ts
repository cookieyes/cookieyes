export function insertImport(src: string, importLine: string): string {
  const importRegex = /^import\s.+$/gm;
  let lastImportEnd = -1;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(src)) !== null) {
    lastImportEnd = match.index + match[0].length;
  }
  if (lastImportEnd > -1) {
    return src.slice(0, lastImportEnd) + `\n${importLine}` + src.slice(lastImportEnd);
  }
  return `${importLine}\n${src}`;
}

export function patchNextjsLayout(src: string): string | null {
  if (src.includes("CookieYesRoot") && src.includes("consent-manager")) return null;

  let patched = insertImport(src, `import { CookieYesRoot } from "@/components/consent-manager";`);

  patched = patched.replace(/\{children\}/g, `{children}\n        <CookieYesRoot />`);

  return patched === src ? null : patched;
}

export function patchNextjsPagesApp(src: string): string | null {
  if (src.includes("CookieYesRoot") && src.includes("consent-manager")) return null;

  const componentTagPattern = /<Component\s+\{\.\.\.pageProps\}\s*\/>/;
  if (!componentTagPattern.test(src)) return null;

  let patched = insertImport(src, `import { CookieYesRoot } from "@/components/consent-manager";`);

  patched = patched.replace(
    componentTagPattern,
    `<>\n      <Component {...pageProps} />\n      <CookieYesRoot />\n    </>`,
  );

  return patched === src ? null : patched;
}

const VUE_MAIN_IMPORT = "./consent-manager";
const VUE_ROOT_IMPORT = "./components/CookieYesRoot.vue";

/** Quote and semicolon style of the file's last import, so an added line matches it. */
function importStyle(src: string): { quote: string; semi: string } {
  const imports = src.match(/^import\s.+$/gm);
  const last = imports?.[imports.length - 1];
  if (!last) return { quote: '"', semi: ";" };
  return { quote: last.includes("'") ? "'" : '"', semi: last.trimEnd().endsWith(";") ? ";" : "" };
}

/** A multi-line import would make `insertImport` cut it in half, so such a file is left alone. */
function hasMultilineImport(src: string): boolean {
  return /^import\s*(?:type\s+)?[\w$]*\s*,?\s*\{[^}\n]*$/m.test(src);
}

/**
 * Add `setupConsent(app)` to a Vue entry file. Handles the one-line
 * `createApp(App).mount("#app")` of `npm create vue` (with any `.use(...)` calls in the chain)
 * and a `const app = createApp(...)` file. Returns null when already patched or when the file
 * has neither shape, so the caller prints the manual step instead of guessing.
 */
export function patchVueMain(src: string): string | null {
  if (src.includes("setupConsent")) return null;
  if (hasMultilineImport(src)) return null;
  const { quote, semi } = importStyle(src);
  const importLine = `import { setupConsent } from ${quote}${VUE_MAIN_IMPORT}${quote}${semi}`;

  const chained =
    /^([ \t]*)(createApp\([^()]*\)(?:\s*\.use\([^()]*\))*)\.mount\(([^()]*)\)(;?)[ \t]*$/m;
  const found = chained.exec(src);
  if (found) {
    // `app` is a new name here; if the file already uses it, the rewrite could shadow or clash.
    if (/(?<![\w$.])app\b/.test(src.replace(/(["'`])(?:\\.|(?!\1).)*\1/g, ""))) return null;
    const [whole, indent = "", chain = "", target = "", end = ""] = found;
    const rewritten = [
      `${indent}const app = ${chain}${end}`,
      `${indent}setupConsent(app)${end}`,
      `${indent}app.mount(${target})${end}`,
    ].join("\n");
    return insertImport(
      src.replace(whole, () => rewritten),
      importLine,
    );
  }

  if (!/^[ \t]*(?:const|let)\s+app\s*=\s*createApp\(/m.test(src)) return null;
  const mount = /^([ \t]*)app\.mount\(.*?(;?)[ \t]*$/m.exec(src);
  if (!mount) return null;
  const [line, indent = "", end = ""] = mount;
  return insertImport(
    src.replace(line, () => `${indent}setupConsent(app)${end}\n${line}`),
    importLine,
  );
}

/**
 * Render `<CookieYesRoot />` first in a Vue root component's template and import it in its
 * `<script setup>`. Returns null when already patched or when there is no `<script setup>` or
 * `<template>` to put them in (an Options API component), so the caller prints the manual step.
 */
export function patchVueApp(src: string): string | null {
  if (src.includes("CookieYesRoot")) return null;
  const script = /(<script\b[^>]*\bsetup\b[^>]*>)([\s\S]*?)(<\/script>)/.exec(src);
  if (!script) return null;
  const [whole, open = "", body = "", close = ""] = script;
  if (hasMultilineImport(body)) return null;
  if (!/^<template(?:\s[^>]*)?>/m.test(src)) return null;

  const { quote, semi } = importStyle(body);
  const importLine = `import CookieYesRoot from ${quote}${VUE_ROOT_IMPORT}${quote}${semi}`;
  // `insertImport` would put the line on the same row as the opening tag when the block has no
  // imports yet.
  const newBody = /^import\s/m.test(body)
    ? insertImport(body, importLine)
    : `\n${importLine}${body.startsWith("\n") ? body : `\n${body}`}`;
  return renderRootFirst(src.replace(whole, () => `${open}${newBody}${close}`));
}

/** Put `<CookieYesRoot />` first in the component's template, indented like what follows it. */
function renderRootFirst(src: string): string | null {
  const template = /^<template(?:\s[^>]*)?>/m.exec(src);
  if (!template) return null;
  const end = template.index + template[0].length;
  const indent = /\n([ \t]*)\S/.exec(src.slice(end))?.[1] ?? "  ";
  return `${src.slice(0, end)}\n${indent}<CookieYesRoot />${src.slice(end)}`;
}

/**
 * Render `<CookieYesRoot />` first in a Nuxt `app.vue`, before `<NuxtPage />` or whatever else
 * the template holds. The module auto-imports the component, so no import is added. Returns null
 * when already patched or when the file has no template.
 */
export function patchNuxtApp(src: string): string | null {
  if (src.includes("CookieYesRoot")) return null;
  return renderRootFirst(src);
}

const NUXT_MODULE = "@cookieyes/nuxt";

/** Index just past the string or comment that starts at `i`, or `i` when none starts there. */
function skipLiteral(src: string, i: number): number {
  const c = src.charAt(i);
  if (c === '"' || c === "'" || c === "`") {
    let j = i + 1;
    while (j < src.length && src.charAt(j) !== c) j += src.charAt(j) === "\\" ? 2 : 1;
    return j + 1;
  }
  if (src.startsWith("//", i)) {
    const end = src.indexOf("\n", i);
    return end === -1 ? src.length : end;
  }
  if (src.startsWith("/*", i)) {
    const end = src.indexOf("*/", i + 2);
    return end === -1 ? src.length : end + 2;
  }
  return i;
}

/**
 * Walk the bracket at `open` to its closing bracket, skipping strings and comments. `visit` sees
 * every other character directly inside it (depth 1). Returns the closing index, or -1.
 */
function walkBracket(src: string, open: number, visit?: (i: number) => void): number {
  let depth = 0;
  for (let i = open; i < src.length; ) {
    const next = skipLiteral(src, i);
    if (next !== i) {
      i = next;
      continue;
    }
    const c = src.charAt(i);
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") {
      depth--;
      if (depth === 0) return i;
    } else if (depth === 1) visit?.(i);
    i++;
  }
  return -1;
}

/**
 * Add `"@cookieyes/nuxt"` to the `modules` array of `defineNuxtConfig({...})`, creating the array
 * when the config has none. Returns null when the module is already listed, and also when the file
 * has a shape where an edit could be wrong: no single `defineNuxtConfig({`, a spread that may hold
 * its own `modules`, a `modules` that is not an array literal, or a comment inside the array. The
 * caller then prints the manual step; a second `modules` key would silently drop the first.
 */
export function patchNuxtConfig(src: string): string | null {
  if (/["']@cookieyes\/nuxt["']/.test(src)) return null;
  const calls = [...src.matchAll(/\bdefineNuxtConfig\s*\(\s*\{/g)];
  const call = calls[0];
  if (calls.length !== 1 || call === undefined) return null;
  const open = call.index + call[0].length - 1;

  let modules = -1;
  let spread = false;
  // The last character seen directly in the object, past comments: a key follows `{` or `,`.
  let prev = "{";
  const close = walkBracket(src, open, (i) => {
    if (src.startsWith("...", i)) spread = true;
    const key = /^modules\s*:\s*/.exec(src.slice(i, i + 40));
    if (key && (prev === "{" || prev === ",")) modules = i + key[0].length;
    if (/\S/.test(src.charAt(i))) prev = src.charAt(i);
  });
  if (close === -1 || spread) return null;

  const quote = /["']/.exec(src.slice(open, close))?.[0] ?? '"';
  const entry = `${quote}${NUXT_MODULE}${quote}`;

  if (modules === -1) {
    // A nested `modules:` (Vite's CSS modules, say) is left to the developer rather than risk
    // giving a top-level one a twin.
    if (/\bmodules\s*:/.test(src.slice(open, close))) return null;
    const body = src.slice(open + 1, close);
    if (body.trim() === "")
      return `${src.slice(0, open)}{ modules: [${entry}] }${src.slice(close + 1)}`;
    if (!body.includes("\n")) {
      return `${src.slice(0, open)}{ modules: [${entry}], ${body.trimStart()}${src.slice(close)}`;
    }
    const indent = /\n([ \t]*)\S/.exec(body)?.[1] ?? "  ";
    return `${src.slice(0, open + 1)}\n${indent}modules: [${entry}],${src.slice(open + 1)}`;
  }

  if (src.charAt(modules) !== "[") return null;
  const end = walkBracket(src, modules);
  if (end === -1) return null;
  const inner = src.slice(modules + 1, end);
  if (inner.includes("//") || inner.includes("/*")) return null;
  if (inner.trim() === "") return `${src.slice(0, modules)}[${entry}]${src.slice(end + 1)}`;

  const last = modules + 1 + inner.trimEnd().length - 1;
  const comma = src.charAt(last) === ",";
  let added: string;
  if (inner.includes("\n")) {
    const lineStart = src.lastIndexOf("\n", last) + 1;
    const indent = /^[ \t]*/.exec(src.slice(lineStart))?.[0] ?? "";
    added = comma ? `\n${indent}${entry},` : `,\n${indent}${entry}`;
  } else {
    added = comma ? ` ${entry}` : `, ${entry}`;
  }
  return `${src.slice(0, last + 1)}${added}${src.slice(last + 1)}`;
}
