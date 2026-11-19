import { type ConsentModeOptions, googleConsentModeSnippet } from "@cookieyes/scripts";
import type { CookieYesConfig } from "@cookieyes/vue";
import {
  addComponent,
  addImports,
  addPlugin,
  addServerHandler,
  addServerPlugin,
  createResolver,
  defineNuxtModule,
  useLogger,
} from "@nuxt/kit";
import type { NuxtModule } from "nuxt/schema";
import { _findFunctionPaths } from "./runtime/config.js";
import { _STYLES_CSS_VERSION, CRITICAL_CSS, DEFAULT_STYLES_HREF } from "./styles.js";

/**
 * The `cookieyes` key in `nuxt.config.ts`: the same options `initCookieYes()` takes everywhere
 * else, plus two that only the module uses. Options that hold functions (integrations, callbacks)
 * go under the same key in `app.config.ts` instead, because runtime config is JSON and drops them.
 */
export type ModuleOptions = CookieYesConfig & {
  /** Where the module serves the full stylesheet. Default `/cookieyes/styles.css`. */
  stylesHref?: string | undefined;
  /**
   * Adds Google Consent Mode's deny-by-default snippet at the top of the head, before any Google tag,
   * as `<GoogleConsentMode />` does in Next.js. `true` uses the defaults.
   */
  googleConsentMode?: boolean | ConsentModeOptions | undefined;
};

declare module "nuxt/schema" {
  interface AppConfigInput {
    /** CookieYes options that hold functions: integrations and callbacks. */
    cookieyes?: Partial<CookieYesConfig>;
  }
}

/** Components the module registers globally, by their export name in `@cookieyes/vue`. */
const COMPONENTS = [
  "CookieBanner",
  "CookiePreferences",
  "CookieOptOut",
  "CookieYesProvider",
  "RecallButton",
  "ReloadNotice",
  "GatedFrame",
  "GatedScript",
] as const;

/** Composables, functions and headless part namespaces the module auto-imports. */
const IMPORTS = [
  "useBannerVisibility",
  "useCategories",
  "useConsent",
  "useConsentActions",
  "useConsentCategory",
  "useConsentRuntime",
  "useLanguage",
  "useOnConsentChange",
  "useOptOutOpen",
  "usePreferencesOpen",
  "useRegion",
  "useRegulation",
  "useReloadNotice",
  "useTranslations",
  "getCookieYes",
  // Called from an app plugin with an `order` below -20, which runs before this module's plugin.
  "registerStopHandler",
  "Banner",
  "Preferences",
  "OptOut",
] as const;

// Typed explicitly: inferred, the emitted declaration kept @nuxt/kit's generic `TOptions` name
// instead of `ModuleOptions`, and Nuxt then left the `cookieyes` key in nuxt.config.ts untyped.
/**
 * The CookieYes Nuxt module. Add it to `modules` and put `<CookieYesRoot />` in `app.vue`.
 *
 * @example
 * export default defineNuxtConfig({
 *   modules: ["@cookieyes/nuxt"],
 *   cookieyes: { mode: "cookie-only", regulation: "GDPR" },
 * });
 */
const cookieyesModule: NuxtModule<ModuleOptions, ModuleOptions, false> =
  defineNuxtModule<ModuleOptions>({
    meta: {
      name: "@cookieyes/nuxt",
      configKey: "cookieyes",
      compatibility: { nuxt: ">=4.0.0" },
    },
    // `cookie-only` needs no backend; the same default every adapter documents.
    defaults: { mode: "cookie-only" },
    setup(options, nuxt) {
      const logger = useLogger("cookieyes");
      const { resolve } = createResolver(import.meta.url);
      const { stylesHref = DEFAULT_STYLES_HREF, googleConsentMode, ...config } = options;

      const functionPaths = _findFunctionPaths(config, "cookieyes");
      if (functionPaths.length > 0 && nuxt.options.dev) {
        logger.warn(
          `${functionPaths.join(", ")} in nuxt.config.ts holds a function, which runtime config ` +
            "drops because it is JSON. Move it under `cookieyes` in app.config.ts.",
        );
      }
      nuxt.options.runtimeConfig.public.cookieyes = JSON.parse(JSON.stringify(config));

      // The head tags are written into the HTML by a Nitro plugin rather than through `useHead` or
      // `app.head`: unhead keeps the tags it manages in sync on the client, so it set the full
      // stylesheet back to `media="print"` after the runtime switched it on, and the banner stayed
      // on the critical rules only. Plain server markup is left alone, as `<CookieYesStyles>` is in
      // Next.js. The render hook also runs for client-only shells and prerendered pages. The link's
      // base path is added when the page renders, because NUXT_APP_BASE_URL can change it after the
      // build.
      const consentMode = googleConsentMode
        ? `<script>${googleConsentModeSnippet(googleConsentMode === true ? {} : googleConsentMode)}</script>`
        : "";
      nuxt.options.runtimeConfig.cookieyesHead = {
        markup: `${consentMode}<style>${CRITICAL_CSS}</style>`,
        stylesPath: `${stylesHref}?v=${_STYLES_CSS_VERSION}`,
      };
      addServerPlugin(resolve("./runtime/server/head"));

      nuxt.options.build.transpile.push(resolve("./runtime"));
      addPlugin(resolve("./runtime/plugin"));
      // Decided at build time, not with a dynamic import in the plugin: @cookieyes/vue imports the
      // blocker statically (to re-export it), so a dynamic import pulled it into every app's main
      // bundle. Rules are plain objects and belong here in nuxt.config.ts; set only in
      // app.config.ts, they are not seen, and core logs that the blocker was never registered.
      if ((config.networkBlocker?.rules?.length ?? 0) > 0) {
        addPlugin({ src: resolve("./runtime/network-blocker"), mode: "client" });
      }

      const vueEntry = resolve("./runtime/vue");
      for (const name of COMPONENTS) addComponent({ name, export: name, filePath: vueEntry });
      addComponent({
        name: "CookieYesRoot",
        filePath: resolve("./runtime/components/CookieYesRoot"),
      });
      addImports(IMPORTS.map((name) => ({ name, from: vueEntry })));

      addServerHandler({ route: stylesHref, handler: resolve("./runtime/server/styles") });
      // `nuxt generate` has no server at run time, so it writes the stylesheet as a file a static host
      // serves. Only then: prerendering on a normal build would let the static copy shadow the
      // handler, losing its compression and year-long cache header.
      if (nuxt.options.nitro.static) {
        nuxt.options.nitro.prerender ??= {};
        nuxt.options.nitro.prerender.routes = [
          ...(nuxt.options.nitro.prerender.routes ?? []),
          stylesHref,
        ];
      }
    },
  });

export default cookieyesModule;
