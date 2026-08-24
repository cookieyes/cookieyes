// Decorative column frame behind the page — the two hairlines at the 1152px
// content edges. The design also paints per-section background bands here, but
// only when the `sectionLines` option is on; the default (`cy-nolines`) hides
// them, so they are not ported. Purely decorative, hidden from assistive tech.
export function GridFrame() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: "0px", zIndex: "0", pointerEvents: "none" }}
    >
      <div
        data-grid-frame="1"
        style={{
          position: "absolute",
          top: "0px",
          bottom: "0px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "1152px",
          borderLeft: "1px solid var(--cy-border-soft)",
          borderRight: "1px solid var(--cy-border-soft)",
          boxSizing: "border-box",
        }}
      />
    </div>
  );
}
