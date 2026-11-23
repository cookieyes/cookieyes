import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real files in a temporary project; only the terminal and the package install are faked.
const installPackage = vi.hoisted(() => vi.fn());
vi.mock("@clack/prompts", () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  cancel: vi.fn(),
  note: vi.fn(),
  log: { info: vi.fn(), success: vi.fn(), warn: vi.fn() },
  spinner: () => ({ start: vi.fn(), stop: vi.fn() }),
  isCancel: () => false,
  select: vi.fn(),
  text: vi.fn(),
  multiselect: vi.fn(),
  confirm: vi.fn(),
}));
vi.mock("../utils/install.js", () => ({ installPackage }));

import { note } from "@clack/prompts";
import { runInit } from "../commands/init.js";

let dir: string;

function write(path: string, contents: string): void {
  mkdirSync(join(dir, path, ".."), { recursive: true });
  writeFileSync(join(dir, path), contents, "utf-8");
}

function read(path: string): string {
  return readFileSync(join(dir, path), "utf-8");
}

beforeEach(() => {
  vi.clearAllMocks();
  dir = mkdtempSync(join(tmpdir(), "cy-kit-"));
  vi.spyOn(process, "cwd").mockReturnValue(dir);
  write(
    "package.json",
    JSON.stringify({ devDependencies: { "@sveltejs/kit": "^2.70.0", svelte: "^5.0.0" } }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  rmSync(dir, { recursive: true, force: true });
});

const KIT_LAYOUT = `<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
`;

function manualNotes(): string[] {
  return vi
    .mocked(note)
    .mock.calls.filter((c) => c[1] === "Manual step needed")
    .map((c) => String(c[0]));
}

describe("runInit in a SvelteKit project", () => {
  it("sets up a fresh Kit starter: config, hooks, load, styles route, layout and types", async () => {
    write("tsconfig.json", "{}");
    write(
      "svelte.config.js",
      `import adapter from '@sveltejs/adapter-node';\nexport default {};\n`,
    );
    write("src/app.d.ts", `declare global {\n  namespace App {}\n}\n\nexport {};\n`);
    write("src/routes/+layout.svelte", KIT_LAYOUT);
    write("src/routes/+page.svelte", `<h1>Hi</h1>\n`);

    await runInit(["--yes", "--locales=es"]);

    expect(read("src/lib/cookieyes.ts")).toBe(
      [
        `import type { CookieYesConfig } from "@cookieyes/sveltekit";`,
        `import { es } from "@cookieyes/translations/es";`,
        ``,
        `export const config: CookieYesConfig = {`,
        `  mode: "cookie-only",`,
        `  regulation: "GDPR",`,
        `  colorScheme: "light",`,
        `  i18n: { messages: { es } },`,
        `};`,
        ``,
      ].join("\n"),
    );
    expect(read("src/hooks.server.ts")).toBe(
      `import { cookieyesHandle } from "@cookieyes/sveltekit";\nimport { config } from "./lib/cookieyes";\n\nexport const handle = cookieyesHandle(config);\n`,
    );
    expect(read("src/routes/+layout.server.ts")).toBe(
      `import { loadConsent } from "@cookieyes/sveltekit";\n\nexport const load = loadConsent;\n`,
    );
    expect(read("src/routes/cookieyes/styles.css/+server.ts")).toBe(
      `export { GET } from "@cookieyes/sveltekit/styles-route";\n`,
    );
    expect(read("src/routes/+layout.svelte")).toContain(
      `<CookieYesRoot {config} state={data.consent}>\n  {@render children()}\n</CookieYesRoot>`,
    );
    expect(read("src/routes/+layout.svelte")).toContain(`let { data, children } = $props();`);
    expect(read("src/app.d.ts")).toBe(
      `/// <reference types="@cookieyes/sveltekit" />\ndeclare global {\n  namespace App {}\n}\n\nexport {};\n`,
    );
    expect(installPackage).toHaveBeenCalledWith("@cookieyes/sveltekit", "npm", dir);
    expect(installPackage).toHaveBeenCalledWith("@cookieyes/translations", "npm", dir);
    expect(manualNotes()).toEqual([]);
  });

  it("creates the layout and app.d.ts when the project has none", async () => {
    write("tsconfig.json", "{}");

    await runInit(["--yes", "--no-install"]);

    expect(read("src/routes/+layout.svelte")).toBe(
      [
        `<script lang="ts">`,
        `  import { CookieYesRoot } from "@cookieyes/sveltekit";`,
        `  import { config } from "../lib/cookieyes";`,
        ``,
        `  let { data, children } = $props();`,
        `</script>`,
        ``,
        `<CookieYesRoot {config} state={data.consent}>`,
        `  {@render children()}`,
        `</CookieYesRoot>`,
        ``,
      ].join("\n"),
    );
    expect(read("src/app.d.ts")).toBe(
      `/// <reference types="@cookieyes/sveltekit" />\n\nexport {};\n`,
    );
  });

  it("composes with an existing handle through sequence", async () => {
    write("tsconfig.json", "{}");
    write(
      "src/hooks.server.ts",
      `import type { Handle } from '@sveltejs/kit';\n\nexport const handle: Handle = async ({ event, resolve }) => resolve(event);\n`,
    );
    write("src/routes/+layout.svelte", KIT_LAYOUT);

    await runInit(["--yes", "--no-install"]);

    const hooks = read("src/hooks.server.ts");
    expect(hooks).toContain(`const userHandle: Handle = async`);
    expect(hooks).toContain(`export const handle = sequence(cookieyesHandle(config), userHandle);`);
    expect(manualNotes()).toEqual([]);
  });

  it("prints the manual steps for a hooks file, load function and layout it cannot patch", async () => {
    write("tsconfig.json", "{}");
    write("src/hooks.server.ts", `export const handle = h;\nexport { handle as other };\n`);
    write("src/routes/+layout.server.ts", `export const load = () => ({ a: 1 });\n`);
    write(
      "src/routes/+layout.svelte",
      `<script>\n  let props = $props();\n</script>\n\n<slot />\n`,
    );

    await runInit(["--yes", "--no-install"]);

    const notes = manualNotes();
    expect(notes).toHaveLength(3);
    expect(notes[0]).toContain(`sequence(cookieyesHandle(config), yourHandle)`);
    expect(notes[1]).toContain(`src/routes/+layout.server.ts already exists`);
    expect(notes[2]).toContain(`<CookieYesRoot {config} state={data.consent}>`);
    expect(read("src/hooks.server.ts")).toBe(
      `export const handle = h;\nexport { handle as other };\n`,
    );
    expect(read("src/routes/+layout.server.ts")).toBe(`export const load = () => ({ a: 1 });\n`);
  });

  it("builds for adapter-static: no load, no state, a prerendered styles route", async () => {
    write("tsconfig.json", "{}");
    write(
      "svelte.config.js",
      `import adapter from '@sveltejs/adapter-static';\nexport default {};\n`,
    );
    write("src/routes/+layout.svelte", KIT_LAYOUT);

    await runInit(["--yes", "--no-install"]);

    expect(existsSync(join(dir, "src/routes/+layout.server.ts"))).toBe(false);
    expect(read("src/routes/cookieyes/styles.css/+server.ts")).toBe(
      `export { GET } from "@cookieyes/sveltekit/styles-route";\nexport const prerender = true;\n`,
    );
    const layout = read("src/routes/+layout.svelte");
    expect(layout).toContain(`let { children } = $props();`);
    expect(layout).toContain(`<CookieYesRoot {config}>\n  {@render children()}\n</CookieYesRoot>`);
    expect(manualNotes()).toEqual([]);
  });

  it("writes plain JavaScript files, and no app.d.ts, in a project with no tsconfig", async () => {
    await runInit(["--yes", "--no-install"]);

    expect(read("src/lib/cookieyes.js")).toBe(
      `export const config = {\n  mode: "cookie-only",\n  regulation: "GDPR",\n  colorScheme: "light",\n};\n`,
    );
    expect(read("src/hooks.server.js")).toContain(`export const handle = cookieyesHandle(config);`);
    expect(read("src/routes/+layout.server.js")).toContain(`export const load = loadConsent;`);
    expect(existsSync(join(dir, "src/routes/cookieyes/styles.css/+server.js"))).toBe(true);
    expect(read("src/routes/+layout.svelte")).toContain(`<script>`);
    expect(existsSync(join(dir, "src/app.d.ts"))).toBe(false);
  });

  it("changes nothing on a second run", async () => {
    write("tsconfig.json", "{}");
    write("src/app.d.ts", `export {};\n`);
    write("src/routes/+layout.svelte", KIT_LAYOUT);
    await runInit(["--yes", "--no-install"]);
    const paths = [
      "src/lib/cookieyes.ts",
      "src/hooks.server.ts",
      "src/routes/+layout.server.ts",
      "src/routes/cookieyes/styles.css/+server.ts",
      "src/routes/+layout.svelte",
      "src/app.d.ts",
    ];
    const files = paths.map(read);

    await runInit(["--yes", "--regulation=CCPA", "--no-install"]);

    expect(paths.map(read)).toEqual(files);
    expect(manualNotes()).toEqual([]);
  });

  it("accepts a load function that already uses loadConsent", async () => {
    write("tsconfig.json", "{}");
    write(
      "src/routes/+layout.server.ts",
      `import { loadConsent } from "@cookieyes/sveltekit";\nexport const load = (e) => ({ ...loadConsent(e) });\n`,
    );

    await runInit(["--yes", "--no-install"]);

    expect(manualNotes()).toEqual([]);
  });

  it("refuses --framework svelte in a Kit project", async () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("exit");
    }) as never);

    await expect(runInit(["--framework=svelte", "--yes", "--no-install"])).rejects.toThrow("exit");
    expect(exit).toHaveBeenCalledWith(1);
  });
});
