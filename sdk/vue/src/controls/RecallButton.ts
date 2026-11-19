import { CY_PART, isRecallVisible } from "@cookieyes/ui";
import {
  type ButtonHTMLAttributes,
  defineComponent,
  h,
  onMounted,
  shallowRef,
  Teleport,
} from "vue";
import { revisitIcon } from "../components/icons.js";
import { useConsent } from "../composables/useConsent.js";
import { useConsentActions } from "../composables/useConsentActions.js";
import { useRegulation } from "../composables/useRegulation.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { _useThemeConfig } from "../composables/useThemeConfig.js";
import { _useThemeVars } from "../composables/useThemeVars.js";
import { useTranslations } from "../composables/useTranslations.js";
import { chain, exposeElement, type PartComponent } from "../primitives/utils.js";

/** Button attributes; the default slot replaces the icon. */
export type RecallButtonProps = ButtonHTMLAttributes;

/**
 * The floating button that reopens the visitor's choices once the banner is gone. It opens the
 * preferences dialog, or the opt-out dialog under CCPA.
 */
export const RecallButton: PartComponent<RecallButtonProps> = defineComponent({
  name: "RecallButton",
  inheritAttrs: false,
  setup(_, { attrs, slots, expose }) {
    _useRuntime("<RecallButton>");
    const snapshot = useConsent();
    const regulation = useRegulation();
    const { showPreferences, showOptOut } = useConsentActions();
    const el = exposeElement(expose);
    const { theme, colorScheme } = _useThemeConfig("<RecallButton>");
    const t = useTranslations();
    _useThemeVars(el, theme, colorScheme);
    const mounted = shallowRef(false);
    onMounted(() => {
      mounted.value = true;
    });

    return () => {
      if (!isRecallVisible(snapshot.value, regulation.value)) return null;
      const { onClick, class: className, ...rest } = attrs;
      const onActivate = regulation.value === "CCPA" ? showOptOut : showPreferences;
      const button = h(
        "button",
        {
          ref: el,
          type: "button",
          "aria-label": t.value.recallButtonLabel,
          "aria-haspopup": "dialog",
          class: className ?? "cy-widget",
          "data-cy-part": CY_PART.recall.root,
          "data-tooltip": t.value.recallButtonLabel,
          onClick: chain(onClick, onActivate),
          ...rest,
        },
        slots.default ? slots.default() : [revisitIcon()],
      );
      // The same constant-target Teleport as `Banner.Root`; see the note there.
      return h(Teleport, { to: "#cookieyes-portal-root", disabled: !mounted.value }, [button]);
    };
  },
}) as unknown as PartComponent<RecallButtonProps>;
