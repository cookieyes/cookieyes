import { CY_PART, focusRecallAfterBanner } from "@cookieyes/ui";
import {
  type AnchorHTMLAttributes,
  defineComponent,
  type HTMLAttributes,
  h,
  onMounted,
  shallowRef,
  Teleport,
  watch,
} from "vue";
import { defineBranding } from "../components/BrandingLink.js";
import { crossIcon } from "../components/icons.js";
import { useBannerVisibility } from "../composables/useBannerVisibility.js";
import { useRegulation } from "../composables/useRegulation.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { useTranslations } from "../composables/useTranslations.js";
import { type ActionComponent, defineAction, definePart } from "./action.js";
import { exposeElement, type PartComponent } from "./utils.js";

const Root = defineComponent({
  name: "BannerRoot",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    _useRuntime("<Banner.Root>");
    const visible = useBannerVisibility();
    const el = exposeElement(expose);
    const mounted = shallowRef(false);
    const { theme, colorScheme } = _useThemeConfig("<Banner.Root>");
    _useThemeVars(el, theme, colorScheme);

    // Was the banner already on screen the last time it rendered?
    //
    // The banner is server-rendered inline, then moved into the portal root once mounted. The
    // move keeps the node, but the CSS entry animation restarts whenever a node is inserted, so
    // a banner that was already visible would fade in a second time, plainly visible on a slow
    // device where hydration lands late. Animate when the banner genuinely appears, and set
    // `data-cy-entered` to skip the animation when this render is only the move of one that was
    // already visible. The flag is reset when the banner hides so a later reappearance (after
    // `resetConsent`, say) animates normally. A plain closure variable, not a ref: it must not
    // schedule a render of its own.
    let wasVisible = false;
    onMounted(() => {
      wasVisible = visible.value;
      mounted.value = true;
    });
    watch(
      visible,
      (now, before) => {
        if (before && !now) focusRecallAfterBanner();
        wasVisible = now;
      },
      { flush: "post" },
    );

    return () => {
      if (!visible.value) return null;
      const content = h(
        "div",
        {
          ref: el,
          "data-cy-part": CY_PART.banner.root,
          // Suppresses the entry animation on the card inside; see `wasVisible`.
          ...(wasVisible ? { "data-cy-entered": "" } : {}),
          ...attrs,
        },
        slots.default?.(),
      );
      // The target is a constant string on purpose. Vue resolves it once, when the Teleport
      // mounts, and does not look again when `disabled` changes; changing `to` after hydration
      // throws on Vue 3.5.0 to 3.5.27. The plugin creates the element before the app mounts.
      // Disabled until mounted, the content renders inline, which is what the server sent.
      return h(Teleport, { to: "#cookieyes-portal-root", disabled: !mounted.value }, [content]);
    };
  },
}) as unknown as PartComponent<HTMLAttributes>;

/** Titles the dialog the banner renders as; `Preferences.Title` and `OptOut.Title` match. */
const Title = definePart<HTMLAttributes>("Banner.Title", "h2", () => {
  const t = useTranslations();
  return () => ({
    attrs: { "data-cy-part": CY_PART.banner.title },
    fallback: t.value.bannerTitle,
  });
});

const Description = definePart<HTMLAttributes>("Banner.Description", "p", () => {
  const t = useTranslations();
  const regulation = useRegulation();
  return () => ({
    attrs: { "data-cy-part": CY_PART.banner.description },
    fallback: regulation.value === "CCPA" ? t.value.ccpaDescription : t.value.bannerDescription,
  });
});

const Actions = definePart<HTMLAttributes>("Banner.Actions", "div", () => () => ({
  attrs: { "data-cy-part": CY_PART.banner.actions },
}));

const AcceptAll = defineAction({
  name: "Banner.AcceptAll",
  part: CY_PART.banner.acceptAll,
  source: "banner",
  run: (actions) => actions.acceptAll,
  fallback: (t) => t.acceptAll,
});

const RejectAll = defineAction({
  name: "Banner.RejectAll",
  part: CY_PART.banner.rejectAll,
  source: "banner",
  run: (actions) => actions.rejectAll,
  fallback: (t) => t.rejectAll,
});

const OpenPreferences = defineAction({
  name: "Banner.OpenPreferences",
  part: CY_PART.banner.customise,
  run: (actions) => actions.showPreferences,
  fallback: (t) => t.managePreferences,
  extra: { "aria-haspopup": "dialog" },
});

const Close = defineAction({
  name: "Banner.Close",
  part: CY_PART.banner.close,
  // Only closes: no consent is saved, granted or denied.
  run: (actions) => actions.dismissBanner,
  fallback: () => crossIcon(9),
  ariaLabel: (t) => t.bannerCloseLabel,
});

const DoNotSell = defineAction({
  name: "Banner.DoNotSell",
  part: CY_PART.banner.doNotSell,
  run: (actions) => actions.showOptOut,
  fallback: (t) => t.doNotSell,
  extra: { "aria-haspopup": "dialog" },
});

const Branding = defineBranding("Banner.Branding", CY_PART.banner.branding);

/** The banner's parts. Compose them, or use `<CookieBanner />` for the styled default. */
export const Banner: {
  Root: PartComponent<HTMLAttributes>;
  Title: PartComponent<HTMLAttributes>;
  Description: PartComponent<HTMLAttributes>;
  Actions: PartComponent<HTMLAttributes>;
  AcceptAll: ActionComponent;
  RejectAll: ActionComponent;
  OpenPreferences: ActionComponent;
  Close: ActionComponent;
  DoNotSell: ActionComponent;
  Branding: PartComponent<AnchorHTMLAttributes>;
} = {
  Root,
  Title,
  Description,
  Actions,
  AcceptAll,
  RejectAll,
  OpenPreferences,
  Close,
  DoNotSell,
  Branding,
};
