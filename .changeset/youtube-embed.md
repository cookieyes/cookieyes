---
"@cookieyes/react": minor
"@cookieyes/nextjs": minor
"@cookieyes/vue": minor
"@cookieyes/nuxt": minor
"@cookieyes/svelte": minor
"@cookieyes/sveltekit": minor
"@cookieyes/ui": minor
"@cookieyes/vanilla": patch
---

React, Next.js, Vue, Nuxt, Svelte and SvelteKit apps can now embed a YouTube video with one component that contacts YouTube only after the visitor allows it.

**New: `<YouTubeEmbed>`.** Give it a `videoId` (a video or a Short) or a `playlistId`, and a `title`. It loads the player from the privacy-enhanced `youtube-nocookie.com` once the `advertisement` category is granted, and removes it again if the visitor withdraws. `category`, `params` and `domain` change those defaults. Nuxt registers the component automatically.

```tsx
<YouTubeEmbed videoId="jNQXAC9IVRw" title="Me at the zoo" />
```

**A placeholder that looks like a video.** Until consent, the box shows a play icon, a sentence naming YouTube and the category, a button that allows that category for the whole site, and a link to Google's privacy policy. Nothing is fetched from YouTube for it, not even a thumbnail. `poster` shows an image you host behind the text.

**One 16:9 box.** The placeholder and the player share it, so nothing moves when they swap. It is full width; give it another size with a class of your own. The SDK writes no inline styles, so this works under a strict `style-src` policy.

**New: `youTubeEmbedUrl()`** is also exported from each of these packages, for an iframe you mark for `blockIframes()`.

The shared stylesheet gains the styles for this embed, which is why every package that ships it is listed: `styles.css` goes from 3.82 KB to 4.03 KB gzipped.
