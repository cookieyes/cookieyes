// Ported from design/cydev/CookieYes Landing.dc.html — section "05 Built to last".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function BuiltToLast() {
  return (
    <section
      className="cy-band-light section--beveled section--beveled"
      data-screen-label="05 Built to last"
      style={{
        position: "relative",
        zIndex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgb(248, 249, 250)",
      }}
    >
      {" "}
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
          data-rsp="btl-split"
          data-rv-split=""
          style={{
            width: "100%",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--cy-space-48)",
            alignItems: "stretch",
          }}
        >
          {" "}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              minWidth: "0px",
            }}
          >
            {" "}
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
              {"Built to last"}
            </h2>{" "}
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
              {"Before you add a dependency, you want to know it will still be there."}
            </p>{" "}
            <div
              data-btl-rows=""
              style={{
                width: "100%",
                marginTop: "var(--cy-space-32)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {" "}
              <div
                style={{
                  width: "100%",
                  borderTop: "1px solid var(--cy-border)",
                  padding: "var(--cy-space-20) 0",
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  gap: "var(--cy-space-24)",
                  alignItems: "baseline",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "600",
                    fontSize: "1.5rem",
                    lineHeight: "30px",
                    color: "var(--cy-ok)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {"MIT"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.8125rem",
                    lineHeight: "19.5px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {"Own it, fork it, keep it forever. "}
                  <a
                    href="https://github.com/cookieyes/cookieyes"
                    className="scpe"
                    style={{
                      fontSize: "0.875rem",
                      color: "var(--cy-fg)",
                      fontWeight: "500",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {"Public on GitHub ↗"}
                  </a>
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  width: "100%",
                  borderTop: "1px solid var(--cy-border)",
                  padding: "var(--cy-space-20) 0",
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  gap: "var(--cy-space-24)",
                  alignItems: "baseline",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "600",
                    fontSize: "1.5rem",
                    lineHeight: "30px",
                    color: "var(--cy-accent)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {"9 KB gz"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.8125rem",
                    lineHeight: "19.5px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {
                    "The whole banner, gzipped, with zero runtime dependencies. Nothing extra to break."
                  }
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  width: "100%",
                  borderTop: "1px solid var(--cy-border)",
                  borderBottom: "1px solid var(--cy-border)",
                  padding: "var(--cy-space-20) 0",
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  gap: "var(--cy-space-24)",
                  alignItems: "baseline",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "600",
                    fontSize: "1.5rem",
                    lineHeight: "30px",
                    color: "var(--cy-const)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {"1.5M sites"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.8125rem",
                    lineHeight: "19.5px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {"Running consent since 2018. Maintained by CookieYes."}
                </span>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div
            className="cy-fwbox"
            style={{
              background: "var(--cy-surface)",
              border: "1px solid var(--cy-border)",
              padding: "var(--cy-card-padding)",
              boxSizing: "border-box",
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "space-between",
              minWidth: "0px",
              height: "100%",
            }}
          >
            {" "}
            <canvas
              data-fwc="63,185,80"
              aria-hidden="true"
              style={{
                position: "absolute",
                inset: "0px",
                width: "100%",
                height: "100%",
                pointerEvents: "none",
              }}
            />{" "}
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "10px",
                  lineHeight: "15px",
                  letterSpacing: "1px",
                  color: "rgba(var(--cy-muted-rgb),0.5)",
                  textTransform: "uppercase",
                }}
              >
                {"Project health"}
              </span>{" "}
              <span
                style={{
                  display: "inline-flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "var(--cy-space-8)",
                }}
              >
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--cy-ok)",
                    animation: "6s ease 0s infinite normal none running cyLivePulse",
                  }}
                />
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "600",
                    fontSize: "0.8125rem",
                    lineHeight: "18px",
                    color: "var(--cy-const)",
                  }}
                >
                  {"v1.0.0"}
                </span>
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "10px",
                    lineHeight: "18px",
                    color: "var(--cy-muted)",
                  }}
                >
                  {"released this week"}
                </span>
              </span>{" "}
            </div>{" "}
            <div
              style={{
                width: "100%",
                marginTop: "var(--cy-space-20)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--cy-space-8)",
              }}
            >
              {" "}
              <div
                data-btl-heat=""
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(11px, 1fr))",
                  gap: "4px",
                  width: "100%",
                }}
              >
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.38)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.55)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.5)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.75)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.35)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.85)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.48)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.8)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.4)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.88)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.45)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.7)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.33)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.9)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.28)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.68)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.3)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.38)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.55)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.38)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.55)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.5)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.75)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.35)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.85)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.48)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.8)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.4)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.88)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.45)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.7)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.33)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.9)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.28)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.68)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.3)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.38)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.3)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.38)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.55)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.5)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.75)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.35)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.85)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.48)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.8)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.4)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.88)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.45)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.7)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.33)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.9)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.28)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.68)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.3)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.68)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.3)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.65)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.38)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.55)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.5)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.75)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.35)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.85)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.48)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.8)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.4)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.88)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.45)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.7)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.33)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.9)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.28)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.68)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.3)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.6)" }} />
                <span style={{ aspectRatio: "1 / 1", background: "rgba(63, 185, 80, 0.25)" }} />
              </div>{" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "9px",
                  lineHeight: "13px",
                  color: "rgba(var(--cy-muted-rgb),0.6)",
                }}
              >
                {"commit activity · last 12 months"}
              </span>{" "}
            </div>{" "}
            <div style={{ width: "100%", paddingTop: "var(--cy-space-20)" }}>
              {" "}
              <svg
                data-btl-spark=""
                viewBox="0 0 260 64"
                preserveAspectRatio="none"
                style={{ display: "block", width: "100%", height: "72px" }}
              >
                {" "}
                <defs>
                  <linearGradient id="cyGrowFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: "rgba(var(--cy-accent-rgb),0.26)" }} />
                    <stop offset="100%" style={{ stopColor: "rgba(var(--cy-accent-rgb),0)" }} />
                  </linearGradient>
                </defs>{" "}
                <path
                  d="M0,58 C50,56 90,50 130,41 C170,32 205,22 230,13 C242,9 250,7 260,5 L260,64 L0,64 Z"
                  style={{ fill: 'url("#cyGrowFill")' }}
                />{" "}
                <path
                  d="M0,58 C50,56 90,50 130,41 C170,32 205,22 230,13 C242,9 250,7 260,5"
                  vectorEffect="non-scaling-stroke"
                  style={{ fill: "none", stroke: "var(--cy-accent)", strokeWidth: "1.5" }}
                />{" "}
                <circle
                  data-btl-dot=""
                  cx="254"
                  cy="6"
                  r="8"
                  style={{ fill: "rgba(var(--cy-accent-rgb),0.16)" }}
                />{" "}
                <circle
                  data-btl-dot=""
                  cx="254"
                  cy="6"
                  r="3"
                  style={{ fill: "var(--cy-accent)" }}
                />{" "}
              </svg>{" "}
              <div
                style={{
                  marginTop: "var(--cy-space-4)",
                  display: "flex",
                  flexDirection: "row",
                  justifyContent: "space-between",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "9px",
                  lineHeight: "13px",
                  color: "rgba(var(--cy-muted-rgb),0.6)",
                }}
              >
                <span>{"2018 · first commit"}</span>
                <span style={{ color: "var(--cy-accent-dim)" }}>{"1.5M sites today"}</span>
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
