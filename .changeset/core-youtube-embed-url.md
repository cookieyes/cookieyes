---
"@cookieyes/core": minor
---

You can now build the address of a YouTube embed with one function, instead of writing it by hand.

**New: `youTubeEmbedUrl()`.** Exported from `@cookieyes/core`. Give it a `videoId` (a video or a Short) or a `playlistId`, and optional player `params`, which are added to the address as given. It returns the address for an iframe's `src` or `data-cy-src`, on the privacy-enhanced `youtube-nocookie.com` unless you set `domain: "youtube.com"`.

```ts
youTubeEmbedUrl({ videoId: "jNQXAC9IVRw", params: { start: 30 } });
// "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw?start=30"
```
