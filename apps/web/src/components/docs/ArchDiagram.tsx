import type { ReactNode } from "react";

type ArchTone = "accent" | "success" | "idea";

interface ArchDiagramProps {
  /** Caption printed under the last row. */
  caption?: string | undefined;
  children: ReactNode;
}

/**
 * Boxes-and-arrows diagram used on the Architecture and Init flow pages. Kept as
 * plain flex rows rather than SVG so it reflows on narrow viewports and inherits
 * the theme tokens in both colour schemes.
 */
export function ArchDiagram({ caption, children }: ArchDiagramProps) {
  return (
    <div className="cy-doc-arch">
      {children}
      {caption ? <p className="cy-doc-arch-caption">{caption}</p> : null}
    </div>
  );
}

export function ArchRow({ children }: { children: ReactNode }) {
  return <div className="cy-doc-arch-row">{children}</div>;
}

export function ArchBox({ tone, children }: { tone?: ArchTone | undefined; children: ReactNode }) {
  return (
    <span className="cy-doc-arch-box" data-tone={tone}>
      {children}
    </span>
  );
}

/**
 * Directional connector. `aria-hidden` because the arrow is decorative — the
 * reading order of the boxes already carries the direction.
 */
export function ArchArrow({ direction = "right" }: { direction?: "right" | "down" }) {
  return (
    <span className="cy-doc-arch-arrow" aria-hidden="true">
      {direction === "down" ? "↓" : "→"}
    </span>
  );
}
