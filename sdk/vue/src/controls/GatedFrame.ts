import { _categoryLabel, _warnUnknownEmbedCategory, type ConsentCategory } from "@cookieyes/core";
import { defineComponent, h, type IframeHTMLAttributes, onMounted, shallowRef, watch } from "vue";
import { useCategories } from "../composables/useCategories.js";
import { useConsentActions } from "../composables/useConsentActions.js";
import { useConsentCategory } from "../composables/useConsentCategory.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { useTranslations } from "../composables/useTranslations.js";
import type { PartComponent } from "../primitives/utils.js";

/** Declared locally so the guard survives as a literal; see core's `deprecations.ts`. */
declare const process: { env: { NODE_ENV?: string } };

/** The global queue core pushes to; see the note in core's `network-blocker.ts`. */
type DevQueueEntry = { k: string; t: number; d: unknown };
type DevQueueArray = DevQueueEntry[] & { v?: number };
type DevGlobal = typeof globalThis & { __COOKIEYES_DEVTOOLS__?: DevQueueArray };

/** Props of `<GatedFrame>`; the `placeholder` slot replaces the default blocked-content text. */
export type GatedFrameProps = Omit<IframeHTMLAttributes, "src"> & {
  src: string;
  category: ConsentCategory;
};

/**
 * An iframe that loads only once its category has been consented to, with a placeholder and a
 * button that opens the preferences dialog until then. The other attributes go to the iframe.
 */
export const GatedFrame: PartComponent<GatedFrameProps, { placeholder?: () => unknown }, object> =
  defineComponent({
    name: "GatedFrame",
    inheritAttrs: false,
    props: {
      src: { type: String, required: true },
      category: { type: String, required: true },
    },
    setup(props, { attrs, slots }) {
      const runtime = _useRuntime("<GatedFrame>");
      const allowed = useConsentCategory(() => props.category);
      const { showPreferences } = useConsentActions();
      const el = shallowRef<HTMLElement | null>(null);
      const { theme, colorScheme } = _useThemeConfig("<GatedFrame>");
      const t = useTranslations();
      const categories = useCategories();
      _useThemeVars(el, theme, colorScheme);

      // Never render a third-party iframe during SSR or the first hydration render: consent is
      // per-visitor and only known in the browser, so the server (a shared process) must not
      // decide it. Show the placeholder until mounted, then let client consent take over. Keeps
      // server and first client render identical (no hydration mismatch, no cross-visitor leak).
      const mounted = shallowRef(false);
      onMounted(() => {
        mounted.value = true;
        watch(
          () => [categories.value, props.category] as const,
          ([resolved, category]) => {
            if (!resolved.ids.includes(category)) _warnUnknownEmbedCategory(category);
          },
          { immediate: true },
        );
        // Dev-only devtools instrumentation: the rendered `<iframe>` carries no marker, so tell
        // the scanner this src is managed, placeholder or not. Folds away in production; see
        // core's `network-blocker.ts`.
        if (process.env.NODE_ENV !== "production") {
          watch(
            () => [props.src, props.category] as const,
            ([src, category]) => {
              const q = ((globalThis as DevGlobal).__COOKIEYES_DEVTOOLS__ ??= Object.assign([], {
                v: 1,
              }));
              if (q.length >= 500) q.shift();
              q.push({ k: "s", t: Date.now(), d: { id: src, src, category, via: "GatedFrame" } });
            },
            { immediate: true },
          );
        }
      });

      // Latch: once loaded under a committed grant, keep the iframe for the rest of the session.
      // Revoking doesn't swap it back to the placeholder mid-session; the block takes effect on the
      // next page load (when `allowed` starts false).
      let everAllowed = false;

      return () => {
        if (mounted.value && allowed.value) everAllowed = true;
        if (mounted.value && everAllowed) return h("iframe", { src: props.src, ...attrs });

        const copy = t.value.gatedFrame;
        const [before = "", after = ""] = copy.placeholder.split("{category}");
        return h(
          "div",
          { ref: el, class: "cy-frame-placeholder" },
          slots.placeholder
            ? slots.placeholder()
            : [
                h("p", null, [
                  before,
                  h(
                    "strong",
                    null,
                    _categoryLabel(
                      props.category,
                      t.value,
                      categories.value,
                      runtime.getCategoryText(props.category),
                    ),
                  ),
                  after,
                ]),
                h(
                  "button",
                  {
                    class: "cy-btn cy-btn-primary",
                    type: "button",
                    onClick: () => showPreferences(),
                  },
                  copy.action,
                ),
              ],
        );
      };
    },
  }) as unknown as PartComponent<GatedFrameProps, { placeholder?: () => unknown }, object>;
