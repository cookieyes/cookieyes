// The components, shipped as `.astro` source for the site's Astro to compile. Their logic is in
// `../markup.ts`; each file only hands it `Astro.locals` and its props.

/**
 * Re-exported from `@cookieyes/core`: a privacy-enhanced YouTube embed URL, for a `<GatedFrame />`
 * `src` built in frontmatter. Pure, so it runs on the server and at build time alike.
 */
export { type YouTubeEmbedUrlOptions, youTubeEmbedUrl } from "@cookieyes/core";
export { default as CookieBanner } from "./CookieBanner.astro";
export { default as CookieOptOut } from "./CookieOptOut.astro";
export { default as CookiePreferences } from "./CookiePreferences.astro";
export { default as CookieYesRoot } from "./CookieYesRoot.astro";
export { default as GatedFrame } from "./GatedFrame.astro";
export { default as GatedScript } from "./GatedScript.astro";
export { default as RecallButton } from "./RecallButton.astro";
export { default as ReloadNotice } from "./ReloadNotice.astro";
