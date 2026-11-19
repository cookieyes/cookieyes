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
  const withScript = src.replace(whole, () => `${open}${newBody}${close}`);

  const template = /^<template(?:\s[^>]*)?>/m.exec(withScript);
  if (!template) return null;
  const end = template.index + template[0].length;
  const indent = /\n([ \t]*)\S/.exec(withScript.slice(end))?.[1] ?? "  ";
  return `${withScript.slice(0, end)}\n${indent}<CookieYesRoot />${withScript.slice(end)}`;
}
