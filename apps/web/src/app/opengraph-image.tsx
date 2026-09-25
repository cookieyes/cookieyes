import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/site";

// The card image every page shares when its link is posted on Slack, X or LinkedIn.
// Rendered once at build time; nothing here reads the request.
export const alt = `${SITE_NAME}: open-source consent for React and Next.js`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  // The same wordmark the site uses, in white for the dark card. The file draws in
  // currentColor, which an image outside the page has no colour for.
  const wordmark = (
    await readFile(join(process.cwd(), "public/figma-logos/cookieyes-wordmark.svg"), "utf8")
  ).replaceAll("currentColor", "#ffffff");
  const wordmarkSrc = `data:image/svg+xml;base64,${Buffer.from(wordmark).toString("base64")}`;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        background: "#15171a",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: 36 }}>
        {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain <img>, not next/image. */}
        <img src={wordmarkSrc} width={245} height={40} alt="CookieYes" />
        <span style={{ color: "#b4b8c7" }}>for Developers</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-2px" }}>
          Consent that ships in your bundle
        </div>
        <div style={{ fontSize: 32, color: "#b4b8c7" }}>
          Open-source consent for React and Next.js
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          padding: "16px 24px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.08)",
          fontSize: 30,
        }}
      >
        $ npx @cookieyes/cli init
      </div>
    </div>,
    size,
  );
}
