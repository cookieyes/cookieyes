import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  detectNextLayout,
  detectNextRouter,
  detectReactLayout,
  nextProjectPaths,
  nuxtProjectPaths,
  reactProjectPaths,
  vueProjectPaths,
} from "../utils/detect-layout.js";

let tmp: string;

function touch(relPath: string, contents = "") {
  const full = join(tmp, relPath);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, contents, "utf-8");
}

beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "cy-cli-test-"));
});

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

describe("detectNextLayout", () => {
  it("returns 'src' when src/app/layout.tsx exists", () => {
    touch("src/app/layout.tsx");
    expect(detectNextLayout(tmp)).toBe("src");
  });

  it("returns 'src' when src/pages/_app.tsx exists", () => {
    touch("src/pages/_app.tsx");
    expect(detectNextLayout(tmp)).toBe("src");
  });

  it("returns 'root' when app/layout.tsx exists at the root", () => {
    touch("app/layout.tsx");
    expect(detectNextLayout(tmp)).toBe("root");
  });

  it("returns 'root' when pages/_app.tsx exists at the root", () => {
    touch("pages/_app.tsx");
    expect(detectNextLayout(tmp)).toBe("root");
  });

  it("returns 'root' as the default for empty projects", () => {
    expect(detectNextLayout(tmp)).toBe("root");
  });

  it("recognises layout.js / layout.ts in addition to .tsx", () => {
    touch("src/app/layout.js");
    expect(detectNextLayout(tmp)).toBe("src");
  });
});

describe("detectNextRouter", () => {
  it("returns 'app' when app/ exists under src layout", () => {
    touch("src/app/layout.tsx");
    expect(detectNextRouter(tmp, "src")).toBe("app");
  });

  it("returns 'pages' when only pages/_app exists under src layout", () => {
    touch("src/pages/_app.tsx");
    expect(detectNextRouter(tmp, "src")).toBe("pages");
  });

  it("returns 'app' when app/ exists at root", () => {
    touch("app/layout.tsx");
    expect(detectNextRouter(tmp, "root")).toBe("app");
  });

  it("returns 'pages' when only pages/_app exists at root", () => {
    touch("pages/_app.tsx");
    expect(detectNextRouter(tmp, "root")).toBe("pages");
  });

  it("prefers 'app' if both exist", () => {
    touch("app/layout.tsx");
    touch("pages/_app.tsx");
    expect(detectNextRouter(tmp, "root")).toBe("app");
  });

  it("defaults to 'app' for empty projects", () => {
    expect(detectNextRouter(tmp, "root")).toBe("app");
  });
});

describe("detectReactLayout", () => {
  it("returns 'src' when src/main.tsx exists", () => {
    touch("src/main.tsx");
    expect(detectReactLayout(tmp)).toBe("src");
  });

  it("returns 'src' when src/index.tsx exists", () => {
    touch("src/index.tsx");
    expect(detectReactLayout(tmp)).toBe("src");
  });

  it("returns 'root' when main.tsx is at the project root", () => {
    touch("main.tsx");
    expect(detectReactLayout(tmp)).toBe("root");
  });

  it("returns 'root' when index.jsx is at the project root", () => {
    touch("index.jsx");
    expect(detectReactLayout(tmp)).toBe("root");
  });

  it("prefers 'src' when both src/ and root have entry files", () => {
    touch("src/main.tsx");
    touch("main.tsx");
    expect(detectReactLayout(tmp)).toBe("src");
  });

  it("defaults to 'src' for empty projects", () => {
    expect(detectReactLayout(tmp)).toBe("src");
  });
});

describe("nextProjectPaths", () => {
  it("resolves under src/ when src layout is detected (App Router)", () => {
    touch("src/app/layout.tsx");
    const p = nextProjectPaths(tmp);
    expect(p.layout).toBe("src");
    expect(p.router).toBe("app");
    expect(p.baseDir).toBe(join(tmp, "src"));
    expect(p.providerPath).toBe(join(tmp, "src", "components", "consent-manager", "provider.tsx"));
    expect(p.indexPath).toBe(join(tmp, "src", "components", "consent-manager", "index.tsx"));
    expect(p.appLayoutPath).toBe(join(tmp, "src", "app", "layout.tsx"));
    expect(p.pagesAppPath).toBe(join(tmp, "src", "pages", "_app.tsx"));
  });

  it("resolves under the project root when root layout is detected", () => {
    touch("app/layout.tsx");
    const p = nextProjectPaths(tmp);
    expect(p.layout).toBe("root");
    expect(p.router).toBe("app");
    expect(p.baseDir).toBe(tmp);
    expect(p.providerPath).toBe(join(tmp, "components", "consent-manager", "provider.tsx"));
    expect(p.appLayoutPath).toBe(join(tmp, "app", "layout.tsx"));
  });

  it("flags Pages Router when only pages/_app exists", () => {
    touch("src/pages/_app.tsx");
    const p = nextProjectPaths(tmp);
    expect(p.layout).toBe("src");
    expect(p.router).toBe("pages");
    expect(p.pagesAppPath).toBe(join(tmp, "src", "pages", "_app.tsx"));
  });
});

describe("reactProjectPaths", () => {
  it("resolves under src/ when src layout is detected", () => {
    touch("src/main.tsx");
    const p = reactProjectPaths(tmp);
    expect(p.layout).toBe("src");
    expect(p.baseDir).toBe(join(tmp, "src"));
    expect(p.providerPath).toBe(join(tmp, "src", "components", "consent-manager", "provider.tsx"));
    expect(p.entryCandidates.map((c) => c.label)).toEqual([
      "src/main.tsx",
      "src/main.jsx",
      "src/index.tsx",
      "src/index.jsx",
    ]);
    expect(p.entryCandidates[0]!.path).toBe(join(tmp, "src", "main.tsx"));
  });

  it("resolves at the project root when root layout is detected", () => {
    touch("main.tsx");
    const p = reactProjectPaths(tmp);
    expect(p.layout).toBe("root");
    expect(p.baseDir).toBe(tmp);
    expect(p.providerPath).toBe(join(tmp, "components", "consent-manager", "provider.tsx"));
    expect(p.entryCandidates.map((c) => c.label)).toEqual([
      "main.tsx",
      "main.jsx",
      "index.tsx",
      "index.jsx",
    ]);
    expect(p.entryCandidates[0]!.path).toBe(join(tmp, "main.tsx"));
  });
});

describe("vueProjectPaths", () => {
  it("uses TypeScript files when src/main.ts exists", () => {
    touch("src/main.ts");
    const p = vueProjectPaths(tmp);
    expect(p.typescript).toBe(true);
    expect(p.entryPath).toBe(join(tmp, "src", "main.ts"));
    expect(p.consentManagerLabel).toBe("src/consent-manager.ts");
    expect(p.rootPath).toBe(join(tmp, "src", "components", "CookieYesRoot.vue"));
    expect(p.appPath).toBe(join(tmp, "src", "App.vue"));
  });

  it("uses JavaScript files when only src/main.js exists", () => {
    touch("src/main.js");
    const p = vueProjectPaths(tmp);
    expect(p.typescript).toBe(false);
    expect(p.entryLabel).toBe("src/main.js");
    expect(p.consentManagerLabel).toBe("src/consent-manager.js");
  });

  it("defaults to TypeScript when there is no entry file", () => {
    expect(vueProjectPaths(tmp).typescript).toBe(true);
  });
});

describe("nuxtProjectPaths", () => {
  it("uses the app/ source directory of a Nuxt 4 project", () => {
    touch("nuxt.config.ts");
    touch("app/app.vue");
    const p = nuxtProjectPaths(tmp);
    expect(p.configPath).toBe(join(tmp, "nuxt.config.ts"));
    expect(p.configLabel).toBe("nuxt.config.ts");
    expect(p.appConfigPath).toBe(join(tmp, "app", "app.config.ts"));
    expect(p.appConfigLabel).toBe("app/app.config.ts");
    expect(p.existingAppConfigLabel).toBeNull();
    expect(p.appPath).toBe(join(tmp, "app", "app.vue"));
    expect(p.appLabel).toBe("app/app.vue");
  });

  it("uses the project root when there is no app/ directory", () => {
    touch("nuxt.config.ts");
    const p = nuxtProjectPaths(tmp);
    expect(p.appConfigLabel).toBe("app.config.ts");
    expect(p.appPath).toBe(join(tmp, "app.vue"));
  });

  it("keeps a root app.vue when app/ holds only other files", () => {
    touch("app.vue");
    touch("app/router.options.ts");
    expect(nuxtProjectPaths(tmp).appLabel).toBe("app.vue");
  });

  it("writes JavaScript when the Nuxt config is a .js or .mjs file", () => {
    touch("nuxt.config.mjs");
    const p = nuxtProjectPaths(tmp);
    expect(p.configLabel).toBe("nuxt.config.mjs");
    expect(p.appConfigLabel).toBe("app.config.js");
  });

  it("reports an app config the project already has", () => {
    touch("nuxt.config.ts");
    touch("app/app.config.js");
    expect(nuxtProjectPaths(tmp).existingAppConfigLabel).toBe("app/app.config.js");
  });

  it("has no config path when the project has no Nuxt config", () => {
    const p = nuxtProjectPaths(tmp);
    expect(p.configPath).toBeNull();
    expect(p.configLabel).toBe("nuxt.config.ts");
    expect(p.appConfigLabel).toBe("app.config.ts");
  });
});
