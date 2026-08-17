import type { Cleanup, Integration } from "@cookieyes/core";
import { createQueue } from "./queue.js";

export type CustomScriptConfig = {
  /** Unique id for this script (also used for the debug view and de-duplication). */
  id: string;
  /** Script URL to load once consent is granted. */
  src: string;
  /** Consent category (or categories) that gate it. Pass an array to require more than one. */
  category: string | string[];
  /** How to combine multiple categories: `"all"` (default) or `"any"`. Ignored for a single category. */
  match?: "all" | "any";
  /**
   * What to do on withdrawal. `"remove"` (default) takes the script off the page;
   * `"keep"` leaves it. Only choose `"keep"` if the script manages its own
   * consent — otherwise it keeps running after the visitor said no.
   */
  onRevoke?: "remove" | "keep";
  /** Extra attributes to set on the `<script>` (e.g. `{ "data-id": "..." }`). */
  attrs?: Record<string, string>;
  /**
   * Optionally set up a queue stub before the script loads, so calls made early
   * are buffered (see {@link createQueue}). e.g. `{ global: "myTag", methods: ["track"] }`.
   */
  stub?: { global: string; methods: string[] };
};

/**
 * Gate any third-party `<script>` behind consent with a small piece of config —
 * the quick, one-off option for a script that doesn't have a dedicated preset.
 *
 * The script always loads *after* its category is granted — loading before
 * consent isn't offered here on purpose, since a gated script that loads
 * immediately would run with no consent. If you genuinely need immediate load,
 * write a raw `Integration` instead.
 *
 * @example
 * initCookieYes({ integrations: [customScript({ id: "widget", src: "https://…/w.js", category: "functional" })] });
 */
export function customScript(config: CustomScriptConfig): Integration {
  const elId = `cky-script-${config.id}`;
  const base = {
    id: config.id,
    category: config.category,
    version: 1,
    ...(config.match ? { match: config.match } : {}),
  };

  const inject = (): Promise<HTMLScriptElement | null> =>
    new Promise((resolve, reject) => {
      if (typeof document === "undefined") {
        resolve(null); // SSR — nothing to load
        return;
      }
      if (config.stub) createQueue(config.stub.global, config.stub.methods);
      const existing = document.getElementById(elId) as HTMLScriptElement | null;
      if (existing) {
        resolve(existing);
        return;
      }
      const el = document.createElement("script");
      el.id = elId;
      el.src = config.src;
      el.async = true;
      for (const [key, value] of Object.entries(config.attrs ?? {})) el.setAttribute(key, value);
      el.addEventListener("load", () => resolve(el), { once: true });
      el.addEventListener(
        "error",
        () => {
          el.remove(); // remove so a retry can re-inject
          reject(new Error(`Script "${config.id}" failed to load`));
        },
        { once: true },
      );
      document.head.appendChild(el);
    });

  if ((config.onRevoke ?? "remove") === "keep") {
    return {
      ...base,
      load: "afterConsent",
      onRevoke: "keep",
      setup: () => inject().then(() => {}),
    };
  }
  return {
    ...base,
    load: "afterConsent",
    onRevoke: "remove",
    setup: () => inject().then((): Cleanup => () => document.getElementById(elId)?.remove()),
  };
}
