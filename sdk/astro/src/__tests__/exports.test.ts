import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as client from "../client/index.js";
import * as astro from "../index.js";
import * as server from "../server.js";

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Pins the public surface of every entry. Adding or removing a runtime export is an API change:
 * update these lists, the docs and the changeset together.
 */
describe("@cookieyes/astro exports", () => {
  it("exports exactly the integration and the stylesheet constants", () => {
    expect(Object.keys(astro).sort()).toEqual(
      ["CRITICAL_CSS", "CRITICAL_CSS_HASH", "DEFAULT_STYLES_HREF", "default"].sort(),
    );
  });

  it("exports exactly the server helpers from ./server", () => {
    expect(Object.keys(server).sort()).toEqual([
      "getServerConsent",
      "getServerRegion",
      "readServerConsent",
      "regionFromHeaders",
    ]);
  });

  it("exports exactly the browser functions from ./client", () => {
    expect(Object.keys(client).sort()).toEqual([
      "_boot",
      "blockIframes",
      "getConsent",
      "getConsentActions",
      "getConsentCategory",
      "getCookieYes",
      "onConsentChange",
      "openOptOut",
      "openPreferences",
      "registerStopHandler",
    ]);
  });

  // Read as text: importing `.astro` files needs Astro's compiler, which the fixture build covers.
  it("exports exactly the components from ./components", () => {
    const source = readFileSync(join(here, "..", "components", "index.ts"), "utf8");
    const names = [...source.matchAll(/export \{ default as (\w+) \} from "\.\/(\w+)\.astro"/g)];
    expect(names.every(([, name, file]) => name === file)).toBe(true);
    expect(names.map(([, name]) => name).sort()).toEqual([
      "CookieBanner",
      "CookieOptOut",
      "CookiePreferences",
      "CookieYesRoot",
      "GatedFrame",
      "GatedScript",
      "RecallButton",
      "ReloadNotice",
    ]);
    // Besides the components, one pure helper, typed by the hand-written declarations too.
    expect(source).toContain(
      'export { type YouTubeEmbedUrlOptions, youTubeEmbedUrl } from "@cookieyes/core";',
    );
    const declarations = readFileSync(join(here, "..", "components", "components.d.ts"), "utf8");
    expect(declarations).toContain("youTubeEmbedUrl");
  });

  it("types CookieYesRoot and GatedFrame so they accept slotted content", () => {
    const declarations = readFileSync(join(here, "..", "components", "components.d.ts"), "utf8");
    expect(declarations).toMatch(/CookieYesRoot: AstroComponent<SlotProps>/);
    expect(declarations).toMatch(/GatedFrame: AstroComponent<[^;]*SlotProps/);
    expect(declarations).toContain("type SlotProps = { children?: unknown };");
  });

  it("returns an integration named after the package, with the two setup hooks", () => {
    const integration = astro.default();
    expect(integration.name).toBe("@cookieyes/astro");
    expect(Object.keys(integration.hooks).sort()).toEqual([
      "astro:config:done",
      "astro:config:setup",
    ]);
  });

  it("defaults the stylesheet path to the one every adapter uses", () => {
    expect(astro.DEFAULT_STYLES_HREF).toBe("/cookieyes/styles.css");
  });
});

describe("the published constants", () => {
  const dist = join(here, "..", "..", "dist", "styles.js");
  const nuxt = join(here, "..", "..", "..", "nuxt", "dist", "styles.js");

  // Every adapter inlines the same critical CSS, so a site's CSP needs one hash whichever it uses.
  it.skipIf(!existsSync(dist) || !existsSync(nuxt))(
    "publishes the CRITICAL_CSS_HASH @cookieyes/nuxt publishes",
    async () => {
      const ours = (await import(dist)) as { CRITICAL_CSS_HASH: string };
      const theirs = (await import(nuxt)) as { CRITICAL_CSS_HASH: string };
      expect(ours.CRITICAL_CSS_HASH).toBe(theirs.CRITICAL_CSS_HASH);
      expect(ours.CRITICAL_CSS_HASH).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);
    },
  );
});
