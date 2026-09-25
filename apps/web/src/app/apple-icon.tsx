import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// The home-screen icon iOS asks for. The same mark as icon.svg, drawn edge to edge on its
// light square: iOS rounds the corners itself, so the SVG's round clip is dropped here.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const svg = (await readFile(join(process.cwd(), "src/app/icon.svg"), "utf8")).replace(
    ' clip-path="url(#clip0_1073_207)"',
    "",
  );
  const src = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#FBFBFB" }}>
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain <img>, not next/image. */}
      <img src={src} width={180} height={180} alt="" />
    </div>,
    size,
  );
}
