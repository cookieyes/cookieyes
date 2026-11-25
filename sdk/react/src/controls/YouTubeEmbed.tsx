"use client";

import {
  _categoryLabel,
  _embedPlaceholderText,
  type ConsentCategory,
  type YouTubeEmbedUrlOptions,
  youTubeEmbedUrl,
} from "@cookieyes/core";
import { useCategories } from "../hooks/useCategories.js";
import { useTranslations } from "../hooks/useTranslations.js";
import { _tryGetCookieYes } from "../runtime.js";
import { GatedFrame, type GatedFrameProps } from "./GatedFrame.js";

export type YouTubeEmbedProps = Omit<
  GatedFrameProps,
  "src" | "category" | "placeholder" | "title" | "width" | "height"
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
 * A YouTube player that loads only while its category is consented to. Until then it
 * shows a placeholder with a button that allows the category. Both fill one 16:9 box,
 * so nothing moves when they swap. `className` and `style` go to that box; size it with
 * your own class, because the SDK writes no inline styles. The other attributes go to
 * the iframe.
 */
export function YouTubeEmbed({
  videoId,
  playlistId,
  params,
  domain,
  title,
  category = "advertisement",
  poster,
  className,
  style,
  ...rest
}: YouTubeEmbedProps) {
  const t = useTranslations();
  const categories = useCategories();
  const text = t.embedPlaceholder ?? _embedPlaceholderText;
  const label = _categoryLabel(
    category,
    t,
    categories,
    _tryGetCookieYes()?.getCategoryText(category),
  );
  const fill = (template: string) =>
    template.replace("{provider}", "YouTube").replace("{category}", label);
  const privacyPolicy = fill(text.privacyPolicy);

  // Allows this one category for the whole site and keeps the visitor's other saved
  // choices, the same as the button `blockIframes()` draws.
  const allowCategory = () => {
    const manager = _tryGetCookieYes()?.manager;
    if (!manager) return;
    const granted = manager.committedCategories;
    manager.acceptSelected([...Object.keys(granted).filter((id) => granted[id]), category]);
  };

  return (
    <div className={className ? `cy-youtube ${className}` : "cy-youtube"} style={style}>
      <GatedFrame
        // The attributes of YouTube's own embed code.
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        loading="lazy"
        {...rest}
        src={youTubeEmbedUrl(
          videoId === undefined ? { playlistId, params, domain } : { videoId, params, domain },
        )}
        category={category}
        title={title}
        placeholder={
          <>
            {/* Only an image the developer hosts: YouTube's own thumbnail would contact
                Google before consent. */}
            {poster && <img className="cy-youtube-poster" src={poster} alt="" loading="lazy" />}
            {/* biome-ignore lint/a11y/useSemanticElements: a fieldset would need a visible legend; the group only names which video this placeholder stands for. */}
            <div className="cy-youtube-content" role="group" aria-label={title}>
              <svg className="cy-youtube-play" viewBox="0 0 48 48" aria-hidden="true">
                <circle cx="24" cy="24" r="24" fill="currentColor" opacity="0.25" />
                <path d="M19 15v18l15-9z" fill="currentColor" />
              </svg>
              <p>{fill(text.message)}</p>
              <button className="cy-btn cy-btn-primary" type="button" onClick={allowCategory}>
                {fill(text.allow)}
              </button>
              <a
                href="https://policies.google.com/privacy"
                target="_blank"
                rel="noopener"
                aria-label={`${privacyPolicy} (${t.opensInNewTab})`}
              >
                {privacyPolicy}
              </a>
            </div>
          </>
        }
      />
    </div>
  );
}
