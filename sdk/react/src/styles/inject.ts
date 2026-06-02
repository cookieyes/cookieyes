import type { ThemeConfig } from "@cookieyes/core";
import type { ColorScheme } from "./tokens.js";
import { buildStyleSheet } from "./tokens.js";

const STYLE_ID = "cookieyes-styles";

export function injectStyles(
  theme: ThemeConfig | undefined,
  colorScheme: "light" | "dark" | "system" | undefined,
): void {
  if (typeof document === "undefined") return;
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();

  const scheme: ColorScheme = colorScheme ?? "system";
  const css = buildStyleSheet(theme, scheme);
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  document.head.appendChild(el);
}
