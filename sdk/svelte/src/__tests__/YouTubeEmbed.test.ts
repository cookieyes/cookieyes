import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { YouTubeEmbedProps } from "../controls/types.js";
import YouTubeEmbed from "../controls/YouTubeEmbed.svelte";
import { getCookieYes } from "../runtime.js";
import {
  clearCookie,
  click,
  cookieOnly,
  getByText,
  mountWith,
  settle,
  unmountAll,
} from "./test-utils.js";

const VIDEO = "jNQXAC9IVRw";
const TITLE = "Me at the zoo";
const ADDRESS = `https://www.youtube-nocookie.com/embed/${VIDEO}`;

beforeEach(clearCookie);
afterEach(unmountAll);

async function mountEmbed(props: Record<string, unknown> = { videoId: VIDEO }) {
  const view = mountWith(cookieOnly("GDPR"), YouTubeEmbed, { title: TITLE, ...props });
  await settle();
  return view;
}

describe("YouTubeEmbed", () => {
  it("renders no iframe and no YouTube address before consent", async () => {
    await mountEmbed();
    expect(document.querySelector("iframe")).toBeNull();
    // Not even a thumbnail: nothing in the markup may point at YouTube's hosts.
    expect(document.body.innerHTML).not.toMatch(/youtube(-nocookie)?\.com|ytimg\.com/);
  });

  it("names the video, YouTube and the category in the placeholder", async () => {
    await mountEmbed();
    expect(document.querySelector('[role="group"]')?.getAttribute("aria-label")).toBe(TITLE);
    expect(
      getByText(
        "This content is hosted by YouTube. Viewing it needs your consent to Advertisement cookies.",
      ),
    ).toBeTruthy();
  });

  it("links to Google's privacy policy in a new tab", async () => {
    await mountEmbed();
    const link = getByText("YouTube privacy policy");
    expect(link.getAttribute("href")).toBe("https://policies.google.com/privacy");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("aria-label")).toBe("YouTube privacy policy (opens in new tab)");
  });

  it("allows its category for the whole site and keeps the other saved choices", async () => {
    await mountEmbed();
    const { manager } = getCookieYes();
    manager.acceptSelected(["analytics"]);
    await settle();
    await click(getByText("Allow Advertisement cookies"));
    expect(manager.committedCategories).toMatchObject({
      analytics: true,
      advertisement: true,
      functional: false,
    });
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(ADDRESS);
  });

  it("loads the player with the attributes of YouTube's own embed code", async () => {
    await mountEmbed();
    getCookieYes().manager.acceptAll();
    await settle();
    const iframe = document.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(ADDRESS);
    expect(iframe?.getAttribute("title")).toBe(TITLE);
    expect(iframe?.getAttribute("allow")).toBe(
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    );
    expect(iframe?.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(true);
    expect(iframe?.getAttribute("loading")).toBe("lazy");
  });

  it("returns to the placeholder when the category is withdrawn", async () => {
    await mountEmbed();
    const { manager } = getCookieYes();
    manager.acceptAll();
    await settle();
    expect(document.querySelector("iframe")).not.toBeNull();
    manager.rejectAll();
    await settle();
    expect(document.querySelector("iframe")).toBeNull();
    expect(document.querySelector('[role="group"]')).not.toBeNull();
  });

  it("waits for advertisement by default, and for `category` when given", async () => {
    await mountEmbed();
    getCookieYes().manager.acceptSelected(["functional"]);
    await settle();
    expect(document.querySelector("iframe")).toBeNull();
    unmountAll();
    await mountEmbed({ videoId: VIDEO, category: "functional" });
    getCookieYes().manager.acceptSelected(["functional"]);
    await settle();
    expect(document.querySelector("iframe")).not.toBeNull();
  });

  it("builds the address from the playlist, the parameters and the domain", async () => {
    await mountEmbed({
      playlistId: "PLC77007E23FF423C6",
      params: { start: 30 },
      domain: "youtube.com",
    });
    getCookieYes().manager.acceptAll();
    await settle();
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/videoseries?list=PLC77007E23FF423C6&start=30",
    );
  });

  it("shows a poster only when given, from the address the developer chose", async () => {
    await mountEmbed();
    expect(document.querySelector("img")).toBeNull();
    unmountAll();
    await mountEmbed({ videoId: VIDEO, poster: "/posters/zoo.jpg" });
    expect(document.querySelector("img")?.getAttribute("src")).toBe("/posters/zoo.jpg");
  });

  it("puts class on the box and the other attributes on the iframe", async () => {
    await mountEmbed({ videoId: VIDEO, class: "hero-video", id: "tour" });
    getCookieYes().manager.acceptAll();
    await settle();
    expect(document.querySelector(".cy-youtube")?.classList.contains("hero-video")).toBe(true);
    expect(document.querySelector("iframe")?.id).toBe("tour");
  });

  it("requires a title and exactly one of a video or a playlist (type check)", () => {
    // Nothing is rendered: each entry below must fail the type check.
    const invalid: YouTubeEmbedProps[] = [
      // @ts-expect-error title is required
      { videoId: VIDEO },
      // @ts-expect-error a video or a playlist is required
      { title: TITLE },
      // @ts-expect-error a video and a playlist together are not accepted
      { videoId: VIDEO, playlistId: "PLC77007E23FF423C6", title: TITLE },
    ];
    expect(invalid).toHaveLength(3);
  });
});
