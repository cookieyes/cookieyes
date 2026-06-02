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
