import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CookieYesConfig } from "@cookieyes/core";
import { type ConsentModeOptions, googleConsentModeSnippet } from "@cookieyes/scripts";
import type { AstroIntegration } from "astro";
import { _findFunctionPaths } from "./config.js";
import type { _HeadParts } from "./head.js";
import { _prepaintScript } from "./prepaint/index.js";
import { _STYLES_CSS_VERSION, _WAIT_CSS, CRITICAL_CSS, DEFAULT_STYLES_HREF } from "./styles.js";

/**
 * The options of `cookieyes()`: the same options `initCookieYes()` takes everywhere else, plus two
 * that only the integration uses. Options that hold functions (integrations, callbacks) go in
 * `src/cookieyes.client.ts` instead, because the config reaches the server and the browser as JSON.
 */
export type CookieYesAstroConfig = Partial<CookieYesConfig> & {
  /** Where the stylesheet is served. Default `/cookieyes/styles.css`. */
  stylesHref?: string | undefined;
  /**
   * Adds Google Consent Mode's deny-by-default snippet at the top of the head, before any Google
   * tag, as `<GoogleConsentMode />` does in Next.js. `true` uses the defaults.
   */
  googleConsentMode?: boolean | ConsentModeOptions | undefined;
};

const VIRTUAL_ID = "virtual:cookieyes/config";
const CLIENT_FILES = ["cookieyes.client.ts", "cookieyes.client.js"];

/** The TypeScript the integration adds to the project, so `Astro.locals.cookieyes` is typed. */
const LOCALS_TYPES = `declare namespace App {
  interface Locals {
    /** What @cookieyes/astro read from this request. */
    cookieyes: import("@cookieyes/astro/server").CookieYesLocals;
  }
}
`;

type Algorithm = "SHA-256" | "SHA-384" | "SHA-512";

type Hash = `${"sha256" | "sha384" | "sha512"}-${string}`;

function hash(algorithm: Algorithm, text: string): Hash {
  const name = algorithm.replace("-", "").toLowerCase() as "sha256" | "sha384" | "sha512";
  return `${name}-${createHash(name).update(text, "utf8").digest("base64")}`;
}

/** A path for an import in generated code: forward slashes, so Windows paths work too. */
function importPath(url: URL): string {
  return JSON.stringify(fileURLToPath(url).replace(/\\/g, "/"));
}

/**
 * @internal The head tags for `options`: the Consent Mode default when asked for, the pre-paint
 * script, the critical CSS and the wait rule, and the full stylesheet's URL under `base`.
 */
export function _headParts(
  config: Partial<CookieYesConfig>,
  googleConsentMode: CookieYesAstroConfig["googleConsentMode"],
  stylesHref: string,
  base: string,
): _HeadParts {
  const scripts = [_prepaintScript(config.categories)];
  if (googleConsentMode) {
    scripts.unshift(googleConsentModeSnippet(googleConsentMode === true ? {} : googleConsentMode));
  }
  return {
    scripts,
    styles: [CRITICAL_CSS, _WAIT_CSS],
    href: `${base.replace(/\/$/, "")}${stylesHref}?v=${_STYLES_CSS_VERSION}`,
  };
}

/**
 * The CookieYes Astro integration. Add it to `integrations`, or run `npx astro add
 * @cookieyes/astro`, and put `<CookieYesRoot />` in your layout. It adds the critical CSS, the
 * stylesheet and a small head script to every page, reads each on-demand request for consent and
 * region, and starts the banner in the browser. No CSS import is needed.
 *
 * @example
 * export default defineConfig({
 *   integrations: [cookieyes({ mode: "cookie-only", regulation: "GDPR" })],
 * });
 */
export default function cookieyes(options: CookieYesAstroConfig = {}): AstroIntegration {
  // `cookie-only` needs no backend; the same default every adapter documents.
  const { stylesHref = DEFAULT_STYLES_HREF, googleConsentMode, ...rest } = options;
  const config: Partial<CookieYesConfig> = { mode: "cookie-only", ...rest };

  return {
    name: "@cookieyes/astro",
    hooks: {
      "astro:config:setup": ({
        config: astro,
        command,
        updateConfig,
        addMiddleware,
        addWatchFile,
        injectRoute,
        injectScript,
        logger,
      }) => {
        const functionPaths = _findFunctionPaths(config, "cookieyes");
        if (functionPaths.length > 0 && command === "dev") {
          logger.warn(
            `${functionPaths.join(", ")} in astro.config.mjs holds a function, which is dropped ` +
              "because the config reaches the browser as JSON. Move it to src/cookieyes.client.ts.",
          );
        }
        const json = JSON.parse(JSON.stringify(config)) as CookieYesConfig;

        const candidates = CLIENT_FILES.map((name) => new URL(name, astro.srcDir));
        for (const file of candidates) addWatchFile(file);
        const clientFile = candidates.find((file) => existsSync(file));
        // The head script checks the cookie against the categories it can see here. Categories
        // set only in the client file would make it hide the banner shell from a visitor the
        // runtime then asks again: late, never missing, but avoidable.
        if (clientFile && /\bcategories\s*:/.test(readFileSync(clientFile, "utf8"))) {
          logger.warn(
            "`categories` in src/cookieyes.client.ts is not seen by the head script that decides " +
              "whether a static page shows the banner. Move it to cookieyes() in astro.config.mjs.",
          );
        }

        const head = _headParts(config, googleConsentMode, stylesHref, astro.base);
        const csp = astro.security?.csp;
        // Never turns CSP on; only adds to a policy the site already asked Astro for. `resources`
        // is left alone, because setting it replaces Astro's defaults. `algorithm` is restated
        // because `csp: true` merged with an object loses Astro's default for it, and the build
        // then fails hashing its own scripts.
        if (csp) {
          const algorithm = (typeof csp === "object" && csp.algorithm) || "SHA-256";
          updateConfig({
            security: {
              csp: {
                algorithm,
                scriptDirective: { hashes: head.scripts.map((s) => hash(algorithm, s)) },
                styleDirective: { hashes: head.styles.map((s) => hash(algorithm, s)) },
              },
            },
          });
        }
        if (command === "build") {
          logger.info(
            "Inline head tags, for a Content-Security-Policy you set yourself: " +
              `script-src ${head.scripts.map((s) => `'${hash("SHA-256", s)}'`).join(" ")}; ` +
              `style-src ${head.styles.map((s) => `'${hash("SHA-256", s)}'`).join(" ")}`,
          );
        }

        updateConfig({
          vite: {
            plugins: [
              {
                name: "cookieyes:config",
                resolveId: (id: string) => (id === VIRTUAL_ID ? `\0${VIRTUAL_ID}` : undefined),
                load: (id: string) =>
                  id === `\0${VIRTUAL_ID}`
                    ? `export const config = ${JSON.stringify(json)};\n` +
                      `export const head = ${JSON.stringify(head)};\n` +
                      `export const dev = ${command === "dev"};\n`
                    : undefined,
              },
            ],
            // Bundled rather than left to Node, so the middleware's virtual import and the
            // components' `.astro` files go through Vite.
            ssr: { noExternal: ["@cookieyes/astro"] },
          },
        });

        addMiddleware({ order: "pre", entrypoint: new URL("./middleware.js", import.meta.url) });
        // A static build writes the stylesheet as a file; a server serves it compressed.
        injectRoute({
          pattern: stylesHref,
          entrypoint: new URL("./styles-route.js", import.meta.url),
          prerender: astro.output === "static",
        });

        // Decided here rather than with a dynamic import in the browser: a site without rules
        // never bundles the network blocker, which must register before the runtime starts.
        const lines: string[] = [];
        if ((config.networkBlocker?.rules?.length ?? 0) > 0) {
          lines.push(
            `import ${importPath(new URL("./client/network-blocker.js", import.meta.url))};`,
          );
        }
        lines.push(
          `import { _boot } from ${importPath(new URL("./client/index.js", import.meta.url))};`,
        );
        lines.push(
          clientFile ? `import client from ${importPath(clientFile)};` : "const client = {};",
        );
        lines.push(`_boot(${JSON.stringify(json)}, client);`);
        injectScript("page", lines.join("\n"));
      },
      "astro:config:done": ({ injectTypes }) => {
        injectTypes({ filename: "types.d.ts", content: LOCALS_TYPES });
      },
    },
  };
}
