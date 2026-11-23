import {
  _categoryLabel,
  _embedPlaceholderText,
  type ConsentCategory,
  type YouTubeEmbedUrlOptions,
  youTubeEmbedUrl,
} from "@cookieyes/core";
import { defineComponent, h, type PropType } from "vue";
import { useCategories } from "../composables/useCategories.js";
import { _useRuntime } from "../composables/useRuntime.js";
import { useTranslations } from "../composables/useTranslations.js";
import type { PartComponent } from "../primitives/utils.js";
import { GatedFrame, type GatedFrameProps } from "./GatedFrame.js";

/** Props of `<YouTubeEmbed>`. */
export type YouTubeEmbedProps = Omit<
  GatedFrameProps,
  "src" | "category" | "title" | "width" | "height"
> &
  YouTubeEmbedUrlOptions & {
    /** Names the video for screen readers. */
    title: string;
    /** The category the player waits for. Defaults to `advertisement`. */
    category?: ConsentCategory | undefined;
    /** An image you host, shown behind the placeholder. Nothing is fetched from YouTube. */
    poster?: string | undefined;
  };

/**
 * A YouTube player that loads only while its category is consented to. Until then it shows a
 * placeholder with a button that allows the category. Both fill one 16:9 box, so nothing moves
 * when they swap. `class` and `style` go to that box; size it with your own class, because the
 * SDK writes no inline styles. The other attributes go to the iframe.
 */
export const YouTubeEmbed: PartComponent<
  YouTubeEmbedProps,
  Record<never, never>,
  object
> = defineComponent({
  name: "YouTubeEmbed",
  inheritAttrs: false,
  props: {
    videoId: String,
    playlistId: String,
    params: Object as PropType<Record<string, string | number>>,
    domain: String as PropType<"youtube-nocookie.com" | "youtube.com">,
    title: { type: String, required: true },
    category: { type: String, default: "advertisement" },
    poster: String,
  },
  setup(props, { attrs }) {
    const runtime = _useRuntime("<YouTubeEmbed>");
    const t = useTranslations();
    const categories = useCategories();

    // Allows this one category for the whole site and keeps the visitor's other saved choices,
    // the same as the button `blockIframes()` draws.
    const allowCategory = () => {
      const granted = runtime.manager.committedCategories;
      runtime.manager.acceptSelected([
        ...Object.keys(granted).filter((id) => granted[id]),
        props.category,
      ]);
    };

    return () => {
      const { class: className, style, ...iframeAttrs } = attrs;
      const text = t.value.embedPlaceholder ?? _embedPlaceholderText;
      const label = _categoryLabel(
        props.category,
        t.value,
        categories.value,
        runtime.getCategoryText(props.category),
      );
      const fill = (template: string) =>
        template.replace("{provider}", "YouTube").replace("{category}", label);
      const privacyPolicy = fill(text.privacyPolicy);

      return h("div", { class: ["cy-youtube", className], style }, [
        h(
          GatedFrame,
          {
            // The attributes of YouTube's own embed code.
            allow:
              "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
            referrerpolicy: "strict-origin-when-cross-origin",
            allowfullscreen: true,
            loading: "lazy",
            ...iframeAttrs,
            // Runtime prop declarations cannot say "a video or a playlist"; the public
            // `YouTubeEmbedProps` type does, so the cast only restores what it already checked.
            src: youTubeEmbedUrl(props as YouTubeEmbedUrlOptions),
            category: props.category,
            title: props.title,
          },
          {
            placeholder: () => [
              // Only an image the developer hosts: YouTube's own thumbnail would contact Google
              // before consent.
              props.poster
                ? h("img", {
                    class: "cy-youtube-poster",
                    src: props.poster,
                    alt: "",
                    loading: "lazy",
                  })
                : null,
              h("div", { class: "cy-youtube-content", role: "group", "aria-label": props.title }, [
                h(
                  "svg",
                  { class: "cy-youtube-play", viewBox: "0 0 48 48", "aria-hidden": "true" },
                  [
                    h("circle", { cx: 24, cy: 24, r: 24, fill: "currentColor", opacity: 0.25 }),
                    h("path", { d: "M19 15v18l15-9z", fill: "currentColor" }),
                  ],
                ),
                h("p", null, fill(text.message)),
                h(
                  "button",
                  { class: "cy-btn cy-btn-primary", type: "button", onClick: allowCategory },
                  fill(text.allow),
                ),
                h(
                  "a",
                  {
                    href: "https://policies.google.com/privacy",
                    target: "_blank",
                    rel: "noopener",
                    "aria-label": `${privacyPolicy} (${t.value.opensInNewTab})`,
                  },
                  privacyPolicy,
                ),
              ]),
            ],
          },
        ),
      ]);
    };
  },
}) as unknown as PartComponent<YouTubeEmbedProps, Record<never, never>, object>;
