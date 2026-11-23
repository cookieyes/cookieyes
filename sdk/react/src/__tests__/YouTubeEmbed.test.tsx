import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { YouTubeEmbed } from "../controls/YouTubeEmbed.js";
import { clearCookie, mountOffline, teardown } from "./test-utils.js";

const VIDEO = "jNQXAC9IVRw";
const TITLE = "Me at the zoo";
const ADDRESS = `https://www.youtube-nocookie.com/embed/${VIDEO}`;

beforeEach(clearCookie);
afterEach(() => {
  cleanup();
  teardown();
});

describe("YouTubeEmbed", () => {
  it("renders no iframe and no YouTube address before consent", () => {
    mountOffline("GDPR");
    const { container } = render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    expect(container.querySelector("iframe")).toBeNull();
    // Not even a thumbnail: nothing in the markup may point at YouTube's hosts.
    expect(container.innerHTML).not.toMatch(/youtube(-nocookie)?\.com|ytimg\.com/);
  });

  it("names the video, YouTube and the category in the placeholder", () => {
    mountOffline("GDPR");
    render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    expect(screen.getByRole("group", { name: TITLE })).toBeTruthy();
    expect(
      screen.getByText(
        "This content is hosted by YouTube. Viewing it needs your consent to Advertisement cookies.",
      ),
    ).toBeTruthy();
  });

  it("links to Google's privacy policy in a new tab", () => {
    mountOffline("GDPR");
    render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    const link = screen.getByRole("link", { name: "YouTube privacy policy (opens in new tab)" });
    expect(link.getAttribute("href")).toBe("https://policies.google.com/privacy");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("allows its category for the whole site and keeps the other saved choices", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptSelected(["analytics"]);
    const { container } = render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    fireEvent.click(screen.getByRole("button", { name: "Allow Advertisement cookies" }));
    expect(rt.manager.committedCategories).toMatchObject({
      analytics: true,
      advertisement: true,
      functional: false,
    });
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(ADDRESS);
  });

  it("loads the player with the attributes of YouTube's own embed code", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(ADDRESS);
    expect(iframe?.getAttribute("title")).toBe(TITLE);
    expect(iframe?.getAttribute("allow")).toBe(
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    );
    expect(iframe?.getAttribute("referrerpolicy")).toBe("strict-origin-when-cross-origin");
    expect(iframe?.hasAttribute("allowfullscreen")).toBe(true);
    expect(iframe?.getAttribute("loading")).toBe("lazy");
  });

  it("returns to the placeholder when the category is withdrawn", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    expect(container.querySelector("iframe")).not.toBeNull();
    act(() => rt.manager.rejectAll());
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("group", { name: TITLE })).toBeTruthy();
  });

  it("waits for advertisement by default, and for `category` when given", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptSelected(["functional"]);
    const { container, rerender } = render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    expect(container.querySelector("iframe")).toBeNull();
    rerender(<YouTubeEmbed videoId={VIDEO} title={TITLE} category="functional" />);
    expect(container.querySelector("iframe")).not.toBeNull();
  });

  it("builds the address from the playlist, the parameters and the domain", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(
      <YouTubeEmbed
        playlistId="PLC77007E23FF423C6"
        params={{ start: 30 }}
        domain="youtube.com"
        title={TITLE}
      />,
    );
    expect(container.querySelector("iframe")?.getAttribute("src")).toBe(
      "https://www.youtube.com/embed/videoseries?list=PLC77007E23FF423C6&start=30",
    );
  });

  it("shows a poster only when given, from the address the developer chose", () => {
    mountOffline("GDPR");
    const { container, rerender } = render(<YouTubeEmbed videoId={VIDEO} title={TITLE} />);
    expect(container.querySelector("img")).toBeNull();
    rerender(<YouTubeEmbed videoId={VIDEO} title={TITLE} poster="/posters/zoo.jpg" />);
    expect(container.querySelector("img")?.getAttribute("src")).toBe("/posters/zoo.jpg");
  });

  it("puts className on the box and the other attributes on the iframe", () => {
    const rt = mountOffline("GDPR");
    rt.manager.acceptAll();
    const { container } = render(
      <YouTubeEmbed videoId={VIDEO} title={TITLE} className="hero-video" id="tour" />,
    );
    expect(container.querySelector(".cy-youtube")?.classList.contains("hero-video")).toBe(true);
    expect(container.querySelector("iframe")?.id).toBe("tour");
  });

  it("requires a title and exactly one of a video or a playlist (type check)", () => {
    // Nothing is rendered: each element below must fail the type check.
    const invalid = [
      // @ts-expect-error title is required
      <YouTubeEmbed key="no-title" videoId={VIDEO} />,
      // @ts-expect-error a video or a playlist is required
      <YouTubeEmbed key="no-source" title={TITLE} />,
      // @ts-expect-error a video and a playlist together are not accepted
      <YouTubeEmbed key="both" videoId={VIDEO} playlistId="PLC77007E23FF423C6" title={TITLE} />,
    ];
    expect(invalid).toHaveLength(3);
  });
});
