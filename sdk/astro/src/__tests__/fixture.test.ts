import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { canRunAstro } from "./astro-node.js";

/**
 * Builds the fixture site with the built integration and reads the HTML Astro wrote: the proof
 * that the middleware runs for prerendered pages and that a developer needs no CSS import. Skipped
 * without `dist/` (run `pnpm build` first) and on a Node below Astro's own floor.
 */

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const fixture = join(pkgDir, "test", "fixtures", "basic");
const astroBin = join(
  dirname(createRequire(import.meta.url).resolve("astro/package.json")),
  "bin",
  "astro.mjs",
);
const skip = !existsSync(join(pkgDir, "dist", "index.js")) || !canRunAstro();

function build(outDir: string, env: Record<string, string> = {}): string {
  rmSync(join(fixture, outDir), { recursive: true, force: true });
  return execFileSync(process.execPath, [astroBin, "build"], {
    cwd: fixture,
    env: { ...process.env, ...env, FIXTURE_OUT_DIR: outDir, ASTRO_TELEMETRY_DISABLED: "1" },
    encoding: "utf8",
  });
}

const read = (path: string) => readFileSync(join(fixture, path), "utf8");
const sha256 = (text: string) => createHash("sha256").update(text, "utf8").digest("base64");

let log = "";
beforeAll(() => {
  if (skip) return;
  log = build("dist");
  build("dist-csp", { FIXTURE_CSP: "1" });
}, 120_000);

describe.skipIf(skip)("a static build of the fixture site", () => {
  it("opens the head with Consent Mode, the head script, the critical CSS and the stylesheet", () => {
    const html = read("dist/index.html");
    const head =
      /<meta charset="utf-8">(<script>.*?<\/script>)(<script>.*?<\/script>)<style>(.*?)<\/style><style>(.*?)<\/style>(<link[^>]*>)/s.exec(
        html,
      );
    expect(head).not.toBeNull();
    const [, consentMode, prepaint, critical, wait, link] = head as unknown as string[];
    expect(consentMode).toContain("gtag('consent','default'");
    expect(prepaint).toContain('setAttribute("data-cy-banner","show")');
    expect(prepaint).not.toContain("__CY_");
    expect(critical).toBe(readFileSync(join(pkgDir, "dist", "critical.css"), "utf8"));
    expect(wait).toContain("[data-cy-wait]");
    expect(link).toMatch(
      /^<link rel="stylesheet" href="\/cookieyes\/styles\.css\?v=\w{12}" media="print" data-cy-full>$/,
    );
  });

  it("holds the banner hidden until the head script reveals it, in the persisted root", () => {
    const html = read("dist/index.html");
    expect(html).toContain(
      '<div id="cookieyes-portal-root" data-astro-transition-persist="cookieyes">',
    );
    expect(html).toMatch(/<div class="cy-banner-wrap" data-cy-shell data-cy-wait>/);
    expect(html).toContain('"request":{"read":false}');
  });

  it("renders a page that asked for on-request rendering as a shared one", () => {
    expect(read("dist/live/index.html")).toContain('<p id="locals">shared GDPR</p>');
  });

  it("writes the stylesheet as a file, with no CSS import in the site", () => {
    expect(read("dist/cookieyes/styles.css")).toBe(
      readFileSync(join(pkgDir, "dist", "styles.css"), "utf8"),
    );
  });

  it("applies the slot's components and their classes", () => {
    const html = read("dist/custom/index.html");
    expect(html).toContain('class="cy-banner site-banner"');
    expect(html).toContain('"surfaces":["banner","preferences","recall"]');
    expect(html).toContain('"preferences":{"save":"site-save"}');
  });

  it("bundles the client file and the network blocker into the page entry", () => {
    const assets = readdirSync(join(fixture, "dist", "_astro"))
      .filter((f) => f.endsWith(".js"))
      .map((f) => read(join("dist", "_astro", f)))
      .join("\n");
    expect(assets).toContain("__cyUpdated");
    expect(assets).toContain("cookieyes-page");
    expect(assets).toContain("blocked.example");
  });

  it("prints the head hashes for a policy the site sets itself", () => {
    expect(log).toMatch(/script-src 'sha256-[^']+' 'sha256-[^']+'; style-src 'sha256-/);
  });

  it("adds every inline head tag's hash to Astro's own policy when CSP is on", () => {
    const html = read("dist-csp/index.html");
    const policy = /<meta http-equiv="content-security-policy" content="([^"]*)"/.exec(html)?.[1];
    expect(policy).toBeDefined();
    const inline = [...html.matchAll(/<(script|style)>(.*?)<\/\1>/gs)].slice(0, 4);
    expect(inline).toHaveLength(4);
    for (const [, , body] of inline) expect(policy).toContain(`'sha256-${sha256(body as string)}'`);
  });
});
