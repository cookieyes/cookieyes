import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// A PNG copy of icon.svg, declared next to it. Google Search's favicon is most reliably
// picked up from a square raster icon whose side is a multiple of 48px; browsers keep
// using the SVG.
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default async function PngIcon() {
  const svg = await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8");
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex" }}>
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain <img>, not next/image. */}
      <img src={src} width={192} height={192} alt="" />
    </div>,
    size,
  );
}
