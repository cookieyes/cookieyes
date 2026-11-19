import { announceBanner, CY_PART } from "@cookieyes/ui";
import {
  type CSSProperties,
  type DefineComponent,
  defineComponent,
  Fragment,
  type HTMLAttributes,
  h,
  onMounted,
  type PropType,
  shallowRef,
  useId,
  watch,
} from "vue";
import { useBannerVisibility } from "../composables/useBannerVisibility.js";
import { useRegulation } from "../composables/useRegulation.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { useTranslations } from "../composables/useTranslations.js";
import { Banner } from "../primitives/Banner.js";
import { useFocusTrap } from "../primitives/utils.js";
import { cardAttrs, part } from "./part.js";

/** Every styleable part of the banner: keys for {@link CookieBannerProps.classNames}. */
export type BannerPart = keyof typeof CY_PART.banner;

/**
 * Styling passthrough. `class` and `style` target the visible banner card; `classNames` and
 * `styles` target individual parts by name (for example `acceptAll`), each merged on top of our
 * defaults. A class you pass always wins over ours (ours are single-class rules with no
 * `!important`, so yours wins on source order when your sheet loads later); an inline `style`
 * wins over any class.
 */
export type CookieBannerProps = {
  class?: HTMLAttributes["class"];
  style?: HTMLAttributes["style"];
  classNames?: Partial<Record<BannerPart, string>>;
  styles?: Partial<Record<BannerPart, CSSProperties>>;
};

/** The styled default banner, built from the `Banner` parts. */
export const CookieBanner: DefineComponent<CookieBannerProps> = defineComponent({
  name: "CookieBanner",
  inheritAttrs: false,
  props: {
    classNames: { type: Object as PropType<CookieBannerProps["classNames"]>, default: undefined },
    styles: { type: Object as PropType<CookieBannerProps["styles"]>, default: undefined },
  },
  setup(props, { attrs }) {
    _useRuntime("<CookieBanner>");
    const regulation = useRegulation();
    const t = useTranslations();
    const titleId = useId();
    const visible = useBannerVisibility();
    // Modal: Tab stays inside the banner until the visitor answers. Focus is not moved in on
    // load; the first Tab from the page lands on the banner.
    const cardRef = shallowRef<HTMLElement | null>(null);
    useFocusTrap(visible, cardRef);

    // Rendered outside <Banner.Root>, unconditionally, so a later appearance (after "reset
    // consent", say) is a change to an element assistive tech has tracked all along rather than
    // a freshly inserted one. The delay is `announceBanner`'s; see `@cookieyes/ui` for why.
    const announcement = shallowRef("");
    onMounted(() => {
      watch(
        [visible, () => t.value.bannerTitle],
        ([isVisible, title], _before, onCleanup) => {
          if (!isVisible) {
            announcement.value = "";
            return;
          }
          onCleanup(
            announceBanner(title, (text) => {
              announcement.value = text;
            }),
          );
        },
        { immediate: true },
      );
    });

    return () => {
      const { classNames, styles } = props;
      const p = (key: BannerPart, base: string) => part(classNames, styles, key, base);
      const isCCPA = regulation.value === "CCPA";
      return h(Fragment, null, [
        // A consent prompt is important enough to justify aria-live="assertive" over "polite":
        // it is more consistently announced by assistive tech.
        h("span", { "aria-live": "assertive", class: "cy-sr-only" }, announcement.value),
        // The wrapper is `display: contents` (not a style target), so its `banner` part is
        // suppressed here: the visible card below owns it instead.
        h(
          Banner.Root,
          { class: "cy-banner-wrap", "data-cy-part": undefined },
          {
            // Canonical banner element: the visible card carries the stable `data-cky-banner`
            // hook and the dialog role, and (via `display: contents` on the wrapper) is the only
            // measurable banner box.
            default: () =>
              h(
                "div",
                {
                  ref: cardRef,
                  ...cardAttrs(["cy-banner"], attrs, classNames, styles),
                  "data-cky-banner": "",
                  "data-cy-part": CY_PART.banner.root,
                  role: "dialog",
                  "aria-modal": "true",
                  // Named by the visible title. No `aria-live`: the sr-only announcer above is
                  // the only live region, and two would announce the banner twice.
                  "aria-labelledby": titleId,
                },
                [
                  h(Banner.Close, p("close", "cy-banner-close")),
                  h("div", { class: "cy-banner-text" }, [
                    h(Banner.Title, { id: titleId, ...p("title", "cy-banner-title") }),
                    h(Banner.Description, p("description", "cy-banner-description")),
                  ]),
                  h(Banner.Actions, p("actions", "cy-banner-actions"), {
                    default: () =>
                      isCCPA
                        ? [h(Banner.DoNotSell, p("doNotSell", "cy-btn cy-btn-do-not-sell"))]
                        : [
                            h(Banner.OpenPreferences, p("customise", "cy-btn cy-btn-outline")),
                            h(Banner.RejectAll, p("rejectAll", "cy-btn cy-btn-primary")),
                            h(Banner.AcceptAll, p("acceptAll", "cy-btn cy-btn-primary")),
                          ],
                  }),
                  h(
                    "div",
                    { class: `cy-banner-footer${isCCPA ? " cy-banner-footer--ccpa" : ""}` },
                    [h(Banner.Branding, p("branding", "cy-branding"))],
                  ),
                ],
              ),
          },
        ),
      ]);
    };
  },
}) as unknown as DefineComponent<CookieBannerProps>;
