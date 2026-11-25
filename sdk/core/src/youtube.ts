/** What a YouTube player address is built from: one video (or Short), or one playlist. */
export type YouTubeEmbedUrlOptions = (
  | { videoId: string; playlistId?: undefined }
  | { playlistId: string; videoId?: undefined }
) & {
  /** YouTube player parameters, added to the address as given: `{ start: 30, rel: 0 }`. */
  params?: Record<string, string | number> | undefined;
  /** `"youtube.com"` for the standard player. The default is the privacy-enhanced one. */
  domain?: "youtube-nocookie.com" | "youtube.com" | undefined;
};

/**
 * The address of YouTube's embedded player for a video, a Short or a playlist, for an
 * iframe's `src` or `data-cy-src`. A Short takes `videoId`, like any other video. The
 * address is on the privacy-enhanced `youtube-nocookie.com` unless `domain` says otherwise.
 *
 * @example
 * youTubeEmbedUrl({ videoId: "jNQXAC9IVRw", params: { start: 30 } });
 * // "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw?start=30"
 */
export function youTubeEmbedUrl(options: YouTubeEmbedUrlOptions): string {
  const { videoId, playlistId, params, domain = "youtube-nocookie.com" } = options;
  const query = new URLSearchParams();
  if (playlistId) query.set("list", playlistId);
  for (const [name, value] of Object.entries(params ?? {})) query.set(name, String(value));
  const search = query.toString();
  const player = videoId ? encodeURIComponent(videoId) : "videoseries";
  return `https://www.${domain}/embed/${player}${search ? `?${search}` : ""}`;
}
