// Ported from design/cydev/CookieYes Landing.dc.html — section "01 Performance".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function Performance() {
  return (
    <section
      className="cy-band-light section--beveled-panel section--beveled-panel"
      data-screen-label="01 Performance"
      style={{
        position: "relative",
        zIndex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        overflow: "hidden",
        background: "rgb(248, 249, 250)",
      }}
    >
      {" "}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "50%",
          bottom: "0px",
          width: "1440px",
          height: "716px",
          transform: "translateX(-50%)",
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {" "}
        <div
          style={{
            position: "absolute",
            left: "0px",
            top: "0px",
            width: "412.325px",
            height: "1504.64px",
            borderRadius: "50%",
            transform: "matrix(-0.028, -1, 1, -0.028, -26.511, 1000.27)",
            transformOrigin: "0px 0px",
            background:
              "conic-gradient(from 180.507deg, rgb(95, 156, 255) 9.37deg, rgb(107, 242, 179) 72.87deg, rgb(80, 129, 255) 110.62deg, rgb(194, 211, 255) 230.63deg, rgb(132, 166, 255) 360deg)",
            filter: "blur(150px)",
            opacity: "0.85",
          }}
        />{" "}
      </div>{" "}
      <div
        aria-hidden="true"
        data-fx="1"
        style={{
          opacity: "1 !important",
          transition: "opacity 0.9s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          position: "absolute",
          top: "0px",
          left: "50%",
          width: "calc(100% - var(--cy-space-gutter) * 2)",
          maxWidth: "1104px",
          height: "1px",
          pointerEvents: "none",
          transform: "translateX(-50%) scaleX(1) !important",
          transformOrigin: "right center",
          background:
            "linear-gradient(270deg, rgba(var(--cy-line-rgb),0.5) 0%, rgba(var(--cy-line-rgb),0.12) 30%, rgba(var(--cy-line-rgb),0) 70%)",
        }}
      />{" "}
      <div
        aria-hidden="true"
        data-fx="1"
        style={{
          opacity: "1 !important",
          transition: "opacity 0.9s, transform 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          position: "absolute",
          top: "0px",
          left: "min(100% - 25px, 50% + 551px)",
          width: "1px",
          height: "320px",
          pointerEvents: "none",
          transform: "scaleY(1) !important",
          transformOrigin: "center top",
          background:
            "linear-gradient(180deg, rgba(var(--cy-line-rgb),0.55) 0%, rgba(var(--cy-line-rgb),0) 100%)",
        }}
      />{" "}
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
        <canvas
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "0px",
            top: "20px",
            width: "760px",
            maxWidth: "100%",
            height: "280px",
            zIndex: "-1",
            pointerEvents: "none",
          }}
          width="760"
          height="280"
        />{" "}
        <canvas
          data-deco="hot"
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "24px",
            top: "36px",
            width: "760px",
            height: "250px",
            zIndex: "-1",
            pointerEvents: "none",
          }}
        />{" "}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--cy-space-12)",
            alignItems: "flex-start",
            width: "100%",
          }}
        >
          {" "}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              width: "100%",
              maxWidth: "1104px",
            }}
          >
            {" "}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexFlow: "wrap",
                justifyContent: "space-between",
                alignItems: "flex-end",
                gap: "var(--cy-space-24)",
              }}
            >
              <h2
                style={{
                  margin: "0px",
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1.875rem",
                  lineHeight: "36px",
                  letterSpacing: "-0.75px",
                  color: "var(--cy-fg)",
                }}
              >
                {"Performance"}
              </h2>
            </div>{" "}
            <p
              style={{
                margin: "var(--cy-space-8) 0 0",
                fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                fontWeight: "400",
                fontSize: "0.875rem",
                lineHeight: "20px",
                color: "var(--cy-muted)",
              }}
            >
              {"The whole point of frontend-native: it barely touches the page."}
              <br />
              {"Weight and first-paint cost, below."}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div
          style={{
            width: "100%",
            margin: "var(--cy-space-44) 0 var(--cy-space-40)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "var(--cy-space-16)",
          }}
        >
          {" "}
          <div
            style={{
              borderRadius: "16px",
              border: "1px solid rgb(227, 229, 241)",
              background: "var(--cy-surface)",
              padding: "var(--cy-space-32)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "var(--cy-space-24)",
              minWidth: "0px",
            }}
          >
            {" "}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--cy-space-20)",
              }}
            >
              {" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--cy-space-8)",
                  minWidth: "0px",
                }}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    flexFlow: "wrap",
                    alignItems: "baseline",
                    gap: "var(--cy-space-12)",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: "var(--cy-space-4)",
                    }}
                  >
                    {" "}
                    <span
                      className="cy-num"
                      data-count="9"
                      style={{
                        fontFamily: "Poppins, Inter, sans-serif",
                        fontWeight: "500",
                        fontSize: "4rem",
                        lineHeight: "0.85",
                        letterSpacing: "-2px",
                        color: "var(--cy-accent)",
                      }}
                    >
                      {"9"}
                    </span>{" "}
                    <span
                      style={{
                        fontFamily: "Poppins, Inter, sans-serif",
                        fontWeight: "500",
                        fontSize: "1.75rem",
                        lineHeight: "1",
                        letterSpacing: "-1px",
                        color: "var(--cy-accent)",
                      }}
                    >
                      {"KB"}
                    </span>{" "}
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: "600",
                      fontSize: "1.375rem",
                      lineHeight: "26px",
                      color: "var(--cy-fg)",
                    }}
                  >
                    {"/ 29× smaller"}
                  </span>{" "}
                </div>{" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "500",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    color: "rgba(var(--cy-muted-rgb),0.6)",
                  }}
                >
                  {"Bundle size, gzip · log scale"}
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "13px",
                  background: "rgba(var(--cy-accent-rgb),0.09)",
                  flexShrink: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {" "}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {" "}
                  <path
                    d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5M16 5.25l-8 4.5"
                    stroke="var(--cy-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />{" "}
                </svg>{" "}
              </div>{" "}
            </div>{" "}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--cy-space-16)" }}>
              {" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "600",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-fg)",
                  }}
                >
                  {"cookieyes"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "15%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "var(--cy-accent)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="9"
                    data-suffix=" KB"
                    style={{ fontWeight: "600", color: "var(--cy-accent)" }}
                  >
                    {"9 KB"}
                  </span>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"c15t"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "34%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "rgba(var(--cy-accent-rgb),0.32)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="34"
                    data-suffix=" KB"
                    style={{ fontWeight: "600", color: "var(--cy-fg)" }}
                  >
                    {"34 KB"}
                  </span>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"Cookiebot"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "59%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "rgba(var(--cy-accent-rgb),0.32)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="190"
                    data-suffix=" KB"
                    style={{ fontWeight: "600", color: "var(--cy-fg)" }}
                  >
                    {"190 KB"}
                  </span>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"OneTrust"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "64%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "rgba(var(--cy-accent-rgb),0.32)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="260"
                    data-suffix=" KB"
                    style={{ fontWeight: "600", color: "var(--cy-fg)" }}
                  >
                    {"260 KB"}
                  </span>
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div
            style={{
              borderRadius: "16px",
              border: "1px solid rgb(227, 229, 241)",
              background: "var(--cy-surface)",
              padding: "var(--cy-space-32)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "var(--cy-space-24)",
              minWidth: "0px",
            }}
          >
            {" "}
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "var(--cy-space-20)",
              }}
            >
              {" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--cy-space-8)",
                  minWidth: "0px",
                }}
              >
                {" "}
                <div
                  style={{
                    display: "flex",
                    flexFlow: "wrap",
                    alignItems: "baseline",
                    gap: "var(--cy-space-12)",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "baseline",
                      gap: "var(--cy-space-4)",
                    }}
                  >
                    {" "}
                    <span
                      className="cy-num"
                      data-count="6"
                      style={{
                        fontFamily: "Poppins, Inter, sans-serif",
                        fontWeight: "500",
                        fontSize: "4rem",
                        lineHeight: "0.85",
                        letterSpacing: "-2px",
                        color: "var(--cy-accent)",
                      }}
                    >
                      {"6"}
                    </span>{" "}
                    <span
                      style={{
                        fontFamily: "Poppins, Inter, sans-serif",
                        fontWeight: "500",
                        fontSize: "1.75rem",
                        lineHeight: "1",
                        letterSpacing: "-1px",
                        color: "var(--cy-accent)",
                      }}
                    >
                      {"ms"}
                    </span>{" "}
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: "600",
                      fontSize: "1.375rem",
                      lineHeight: "26px",
                      color: "var(--cy-fg)",
                    }}
                  >
                    {"/ 53× faster"}
                  </span>{" "}
                </div>{" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "500",
                    fontSize: "12px",
                    lineHeight: "16px",
                    letterSpacing: "1.2px",
                    textTransform: "uppercase",
                    color: "rgba(var(--cy-muted-rgb),0.6)",
                  }}
                >
                  {"First-paint impact · log scale"}
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "13px",
                  background: "rgba(var(--cy-accent-rgb),0.09)",
                  flexShrink: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {" "}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  {" "}
                  <path
                    d="M5.636 19.364a9 9 0 1 1 12.728 0"
                    stroke="var(--cy-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />{" "}
                  <path
                    d="M16 9l-4 4"
                    stroke="var(--cy-accent)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />{" "}
                </svg>{" "}
              </div>{" "}
            </div>{" "}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--cy-space-16)" }}>
              {" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "600",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-fg)",
                  }}
                >
                  {"cookieyes"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "11%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "var(--cy-accent)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="6"
                    data-suffix=" ms"
                    style={{ fontWeight: "600", color: "var(--cy-accent)" }}
                  >
                    {"6 ms"}
                  </span>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"c15t"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "36%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "rgba(var(--cy-accent-rgb),0.32)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.1s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="38"
                    data-suffix=" ms"
                    style={{ fontWeight: "600", color: "var(--cy-fg)" }}
                  >
                    {"38 ms"}
                  </span>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"Cookiebot"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "58%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "rgba(var(--cy-accent-rgb),0.32)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.2s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="210"
                    data-suffix=" ms"
                    style={{ fontWeight: "600", color: "var(--cy-fg)" }}
                  >
                    {"210 ms"}
                  </span>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "var(--cy-space-12)",
                  alignItems: "center",
                }}
              >
                {" "}
                <span
                  style={{
                    width: "76px",
                    flexShrink: "0",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "12px",
                    lineHeight: "16px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"OneTrust"}
                </span>{" "}
                <div
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "14px",
                    borderRadius: "4px",
                    background: "var(--cy-track)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div
                    className="cy-bar"
                    style={{
                      width: "64%",
                      height: "100%",
                      borderRadius: "4px",
                      background: "rgba(var(--cy-accent-rgb),0.32)",
                      transformOrigin: "left center",
                      animation:
                        "0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.3s 1 normal both running cyGrow",
                    }}
                  />
                </div>{" "}
                <span
                  style={{
                    width: "60px",
                    flexShrink: "0",
                    textAlign: "right",
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    lineHeight: "16px",
                  }}
                >
                  <span
                    className="cy-num"
                    data-count="320"
                    data-suffix=" ms"
                    style={{ fontWeight: "600", color: "var(--cy-fg)" }}
                  >
                    {"320 ms"}
                  </span>
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div
          style={{
            width: "100%",
            border: "1px solid transparent",
            padding: "var(--cy-space-12) var(--cy-space-16)",
            boxSizing: "border-box",
          }}
        >
          {" "}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontWeight: "400",
              fontSize: "12px",
              lineHeight: "16px",
              color: "rgba(var(--cy-muted-rgb),0.4)",
            }}
          >
            {
              "Methodology: [placeholder] · Measured: [date TBC] · Figures are illustrative; replace with reproducible measurements."
            }
          </span>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
