import { splitPoweredBy } from "@cookieyes/ui";
import { type AnchorHTMLAttributes, defineComponent, h, shallowRef } from "vue";
import { _useRuntime } from "../composables/useRuntime.js";
import { useTranslations } from "../composables/useTranslations.js";
import type { PartComponent } from "../primitives/utils.js";
import { cookieYesLogo } from "./icons.js";

/** The "Powered by CookieYes" link shared by the banner and both dialogs. */
export const BrandingLink = defineComponent({
  name: "BrandingLink",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    const t = useTranslations();
    let node: HTMLElement | null = null;
    expose({
      get element() {
        return node;
      },
    });
    return () => {
      const [before, after] = splitPoweredBy(t.value.poweredBy);
      return h(
        "a",
        {
          ref: (el: unknown) => {
            node = el as HTMLElement | null;
          },
          href: "https://www.cookieyes.com",
          target: "_blank",
          rel: "noopener noreferrer",
          // Neither the visible text nor the logo says the link opens a new tab.
          "aria-label": `${t.value.poweredBy} (${t.value.opensInNewTab})`,
          ...attrs,
        },
        slots.default
          ? slots.default()
          : [...(before ? [before] : []), cookieYesLogo(), ...(after ? [after] : [])],
      );
    };
  },
});

/** The `Branding` part of a banner or dialog: the link with that surface's `data-cy-part`. */
export function defineBranding(name: string, part: string): PartComponent<AnchorHTMLAttributes> {
  return defineComponent({
    name: name.replace(".", ""),
    inheritAttrs: false,
    setup(_, { attrs, slots, expose }) {
      _useRuntime(`<${name}>`);
      const link = shallowRef<{ element: HTMLElement | null } | null>(null);
      expose({
        get element() {
          return link.value?.element ?? null;
        },
      });
      return () =>
        h(
          BrandingLink,
          { ref: link, "data-cy-part": part, ...attrs },
          slots.default ? { default: slots.default } : undefined,
        );
    },
  }) as unknown as PartComponent<AnchorHTMLAttributes>;
}
