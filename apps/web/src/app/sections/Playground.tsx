// Ported from design/cydev/CookieYes Landing.dc.html — section "Playground".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function Playground() {
  return (
    <section
      className="cy-band-light pg-empty"
      data-screen-label="Playground"
      style={{
        position: "relative",
        zIndex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {" "}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1152px",
          padding: "var(--cy-section-y) var(--cy-space-gutter)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {" "}
      </div>{" "}
    </section>
  );
}
