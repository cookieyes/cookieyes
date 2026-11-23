import { describe, expect, it } from "vitest";
import { youTubeEmbedUrl } from "../youtube.js";

describe("youTubeEmbedUrl", () => {
  it("builds the privacy-enhanced address for a video by default", () => {
    expect(youTubeEmbedUrl({ videoId: "jNQXAC9IVRw" })).toBe(
      "https://www.youtube-nocookie.com/embed/jNQXAC9IVRw",
    );
  });

  it("builds the playlist address for a playlist", () => {
    expect(youTubeEmbedUrl({ playlistId: "PLC77007E23FF423C6" })).toBe(
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLC77007E23FF423C6",
    );
  });

  it("uses the standard domain when asked", () => {
    expect(youTubeEmbedUrl({ videoId: "jNQXAC9IVRw", domain: "youtube.com" })).toBe(
      "https://www.youtube.com/embed/jNQXAC9IVRw",
    );
  });

  it("adds player parameters as given, without dropping unknown ones", () => {
    expect(
      youTubeEmbedUrl({ videoId: "jNQXAC9IVRw", params: { start: 30, rel: 0, anything: "kept" } }),
    ).toBe("https://www.youtube-nocookie.com/embed/jNQXAC9IVRw?start=30&rel=0&anything=kept");
  });

  it("adds player parameters after the playlist id", () => {
    expect(youTubeEmbedUrl({ playlistId: "PLC77007E23FF423C6", params: { loop: 1 } })).toBe(
      "https://www.youtube-nocookie.com/embed/videoseries?list=PLC77007E23FF423C6&loop=1",
    );
  });

  it("encodes the id and parameter values, so they cannot change the address", () => {
    expect(youTubeEmbedUrl({ videoId: "a/b?c", params: { playlist: "x&autoplay=1" } })).toBe(
      "https://www.youtube-nocookie.com/embed/a%2Fb%3Fc?playlist=x%26autoplay%3D1",
    );
  });
});
