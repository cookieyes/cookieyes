import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import cookieyes, { _headParts } from "../integration.js";

type Setup = Parameters<
  NonNullable<ReturnType<typeof cookieyes>["hooks"]["astro:config:setup"]>
>[0];
type VitePlugin = {
  resolveId: (id: string) => string | undefined;
  load: (id: string) => string | undefined;
};

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A project directory, with `src/cookieyes.client.ts` holding `client` when given. */
function project(client?: string): URL {
  const root = mkdtempSync(join(tmpdir(), "cookieyes-astro-"));
  dirs.push(root);
  if (client !== undefined) writeFileSync(join(root, "cookieyes.client.ts"), client);
  return pathToFileURL(`${root}/`);
}

/** Runs the setup hook with recording stand-ins for Astro's arguments. */
function setup(
  options: Parameters<typeof cookieyes>[0],
  {
    command = "build",
    output = "static",
    security,
    srcDir = project(),
  }: {
    command?: "dev" | "build";
    output?: "static" | "server";
    security?: Record<string, unknown>;
    srcDir?: URL;
  } = {},
) {
  const calls = {
    middleware: [] as unknown[],
    routes: [] as Array<{ pattern: string; entrypoint: URL; prerender?: boolean }>,
    scripts: [] as Array<[string, string]>,
    watched: [] as Array<string | URL>,
    updates: [] as Array<Record<string, unknown>>,
    warn: vi.fn(),
    info: vi.fn(),
  };
  const hook = cookieyes(options).hooks["astro:config:setup"];
  hook?.({
    config: { srcDir, base: "/", output, security },
    command,
    updateConfig: (update: Record<string, unknown>) => calls.updates.push(update),
    addMiddleware: (m: unknown) => calls.middleware.push(m),
    addWatchFile: (f: string | URL) => calls.watched.push(f),
    injectRoute: (r: (typeof calls.routes)[number]) => calls.routes.push(r),
    injectScript: (stage: string, content: string) => calls.scripts.push([stage, content]),
    logger: { warn: calls.warn, info: calls.info },
  } as unknown as Setup);
  return calls;
}

function vitePlugin(calls: ReturnType<typeof setup>): VitePlugin {
  const update = calls.updates.find((u) => "vite" in u) as {
    vite: { plugins: VitePlugin[]; ssr: { noExternal: string[] } };
  };
  return update.vite.plugins[0] as VitePlugin;
}

describe("cookieyes()", () => {
  it("works with no arguments, as `astro add` writes it, defaulting to cookie-only", () => {
    const calls = setup(undefined);
    const plugin = vitePlugin(calls);
    const id = plugin.resolveId("virtual:cookieyes/config") as string;
    expect(plugin.resolveId("other")).toBeUndefined();
    expect(plugin.load("other")).toBeUndefined();
    const code = plugin.load(id) as string;
    expect(code).toContain('export const config = {"mode":"cookie-only"};');
    expect(code).toContain("export const dev = false;");
  });

  it("registers its middleware first, by path", () => {
    const [middleware] = setup({}).middleware as Array<{ order: string; entrypoint: URL }>;
    expect(middleware?.order).toBe("pre");
    expect(middleware?.entrypoint.pathname).toMatch(/\/middleware\.js$/);
  });

  it("prerenders the stylesheet route in a static build and serves it in a server build", () => {
    const [staticRoute] = setup({ stylesHref: "/assets/cy.css" }).routes;
    expect(staticRoute).toMatchObject({ pattern: "/assets/cy.css", prerender: true });
    expect(staticRoute?.entrypoint.pathname).toMatch(/\/styles-route\.js$/);
    expect(setup({}, { output: "server" }).routes[0]).toMatchObject({
      pattern: "/cookieyes/styles.css",
      prerender: false,
    });
  });

  it("bundles itself through Vite, so the virtual module and the components resolve", () => {
    const update = setup({}).updates.find((u) => "vite" in u) as {
      vite: { ssr: { noExternal: string[] } };
    };
    expect(update.vite.ssr.noExternal).toEqual(["@cookieyes/astro"]);
  });
});

describe("the generated page entry", () => {
  it("boots with the JSON config and an empty client config when there is no client file", () => {
    const [[stage, code] = ["", ""]] = setup({ regulation: "GDPR" }).scripts;
    expect(stage).toBe("page");
    expect(code).toMatch(/import \{ _boot \} from ".*\/client\/index\.js";/);
    expect(code).toContain("const client = {};");
    expect(code).toContain('_boot({"mode":"cookie-only","regulation":"GDPR"}, client);');
    expect(code).not.toContain("network-blocker");
  });

  it("imports src/cookieyes.client.ts when it exists, and watches both spellings", () => {
    const srcDir = project("export default {};");
    const calls = setup({}, { srcDir });
    expect(calls.scripts[0]?.[1]).toContain(
      `import client from ${JSON.stringify(new URL("cookieyes.client.ts", srcDir).pathname)};`,
    );
    expect(calls.watched.map(String)).toEqual([
      new URL("cookieyes.client.ts", srcDir).href,
      new URL("cookieyes.client.js", srcDir).href,
    ]);
  });

  it("registers the network blocker first, and only when rules are set", () => {
    const code = setup({
      networkBlocker: { rules: [{ id: "x", domain: "x.example", category: "analytics" }] },
    }).scripts[0]?.[1];
    expect(code?.split("\n")[0]).toMatch(/^import ".*\/client\/network-blocker\.js";$/);
    expect(setup({ networkBlocker: { rules: [] } }).scripts[0]?.[1]).not.toContain(
      "network-blocker",
    );
  });
});

describe("options that hold functions", () => {
  const options = { onConsentUpdate: () => undefined };

  it("warns in development, naming the option and the file, and drops them", () => {
    const calls = setup(options, { command: "dev" });
    expect(calls.warn).toHaveBeenCalledWith(
      expect.stringMatching(
        /cookieyes\.onConsentUpdate in astro\.config\.mjs .* src\/cookieyes\.client\.ts/,
      ),
    );
    expect(calls.scripts[0]?.[1]).not.toContain("onConsentUpdate");
  });

  it("never fails or warns about them in a build", () => {
    expect(setup(options).warn).not.toHaveBeenCalled();
  });

  it("warns when the client file sets categories, which the head script cannot see", () => {
    const calls = setup({}, { srcDir: project("export default { categories: [] };") });
    expect(calls.warn).toHaveBeenCalledWith(expect.stringContaining("`categories`"));
  });
});

describe("Content-Security-Policy", () => {
  const sha = (algorithm: string, text: string) =>
    `${algorithm}-${createHash(algorithm).update(text, "utf8").digest("base64")}`;

  it("adds no hashes when the site has not turned CSP on", () => {
    expect(setup({}).updates.some((u) => "security" in u)).toBe(false);
  });

  it("adds a hash for every inline head tag, with the site's algorithm", () => {
    const calls = setup(
      { googleConsentMode: true },
      { security: { csp: { algorithm: "SHA-384" } } },
    );
    const head = _headParts({ mode: "cookie-only" }, true, "/cookieyes/styles.css", "/");
    expect(calls.updates.find((u) => "security" in u)).toEqual({
      security: {
        csp: {
          algorithm: "SHA-384",
          scriptDirective: { hashes: head.scripts.map((s) => sha("sha384", s)) },
          styleDirective: { hashes: head.styles.map((s) => sha("sha384", s)) },
        },
      },
    });
  });

  it("uses SHA-256 for `csp: true`, and says so, since the merge drops Astro's default", () => {
    const update = setup({}, { security: { csp: true } }).updates.find((u) => "security" in u) as {
      security: { csp: { algorithm: string; styleDirective: { hashes: string[] } } };
    };
    expect(update.security.csp.algorithm).toBe("SHA-256");
    expect(update.security.csp.styleDirective.hashes[0]).toMatch(/^sha256-/);
  });

  it("prints the SHA-256 hashes at build, for a policy the site sets itself", () => {
    const calls = setup({});
    expect(calls.info).toHaveBeenCalledWith(
      expect.stringMatching(/script-src 'sha256-.*style-src 'sha256-/),
    );
    expect(setup({}, { command: "dev" }).info).not.toHaveBeenCalled();
  });
});

describe("_headParts", () => {
  it("puts the Consent Mode default before the head script, and the stylesheet under the base", () => {
    const head = _headParts({ mode: "cookie-only" }, { urlPassthrough: true }, "/cy.css", "/docs/");
    expect(head.scripts).toHaveLength(2);
    expect(head.scripts[0]).toContain("gtag('consent','default'");
    expect(head.scripts[0]).toContain("url_passthrough");
    expect(head.styles).toHaveLength(2);
    expect(head.href).toMatch(/^\/docs\/cy\.css\?v=/);
  });

  it("has only the head script without Consent Mode", () => {
    expect(_headParts({}, false, "/cy.css", "/").scripts).toHaveLength(1);
  });
});

describe("astro:config:done", () => {
  it("types Astro.locals.cookieyes for the project", () => {
    const injectTypes = vi.fn();
    cookieyes().hooks["astro:config:done"]?.({ injectTypes } as never);
    expect(injectTypes).toHaveBeenCalledWith({
      filename: "types.d.ts",
      content: expect.stringContaining(
        'cookieyes: import("@cookieyes/astro/server").CookieYesLocals;',
      ),
    });
  });
});
