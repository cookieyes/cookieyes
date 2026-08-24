// Ported from design/cydev/CookieYes Landing.dc.html — section "04 You own the record".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function OwnTheRecord() {
  return (
    <section
      className="cy-band-light section--beveled"
      data-screen-label="04 You own the record"
      style={{
        position: "relative",
        zIndex: "1",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgb(248, 249, 250)",
      }}
    >
      {" "}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: "0px",
          pointerEvents: "none",
          background:
            "linear-gradient(rgba(19, 111, 232, 0.14) 0%, rgba(19, 111, 232, 0.05) 22%, rgba(19, 111, 232, 0) 42%)",
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
          }}
        >
          {" "}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
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
              {"You own the record."}
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
              {
                "Everything runs in your stack. Consent state is yours to persist — you choose how and where it’s stored."
              }
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div
          data-rsp="own-grid"
          style={{
            width: "100%",
            margin: "var(--cy-space-group) 0",
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "var(--cy-card-gap)",
          }}
        >
          {" "}
          <div
            className="cy-ill-card"
            style={{
              background: "var(--cy-surface)",
              border: "1px solid var(--cy-border)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--cy-space-20)",
              padding: "var(--cy-card-padding)",
              boxSizing: "border-box",
              minHeight: "292px",
              minWidth: "0px",
              transition: "background 0.25s",
            }}
          >
            {" "}
            <div
              className="cy-ill-gray"
              style={{
                flex: "1 1 0%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {" "}
              <div
                className="bp-fade"
                style={{
                  opacity: "0",
                  position: "relative",
                  width: "284px",
                  height: "158px",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  animation: "0.5s ease 0s 1 normal forwards running bpFade",
                }}
              >
                {" "}
                <div
                  style={{
                    position: "absolute",
                    left: "0px",
                    top: "12px",
                    width: "206px",
                    borderRadius: "12px",
                    background: "rgb(23, 26, 33)",
                    boxShadow: "rgba(20, 20, 42, 0.22) 0px 16px 34px",
                    padding: "var(--cy-space-12) var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-8)",
                  }}
                >
                  {" "}
                  <div style={{ display: "flex", flexDirection: "row", gap: "6px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "rgb(255, 95, 87)",
                      }}
                    />
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "rgb(254, 188, 46)",
                      }}
                    />
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "rgb(40, 200, 64)",
                      }}
                    />
                  </div>{" "}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                      fontSize: "10px",
                      lineHeight: "15px",
                    }}
                  >
                    {" "}
                    <span style={{ color: "rgb(86, 96, 121)" }}>{"$ vite build"}</span>{" "}
                    <span
                      data-anim="bpFade 0.3s ease 0.35s both"
                      style={{
                        opacity: "0",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        color: "rgb(138, 145, 166)",
                        animation: "0.3s ease 0.35s 1 normal both running bpFade",
                      }}
                    >
                      <span>{"app.js"}</span>
                      <span>{"142 kb"}</span>
                    </span>{" "}
                    <span
                      data-anim="bpFade 0.3s ease 0.6s both"
                      style={{
                        opacity: "0",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        color: "rgb(138, 145, 166)",
                        animation: "0.3s ease 0.6s 1 normal both running bpFade",
                      }}
                    >
                      <span>{"react-dom"}</span>
                      <span>{"130 kb"}</span>
                    </span>{" "}
                    <span
                      data-anim="bpFade 0.3s ease 0.85s both"
                      style={{
                        opacity: "0",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        color: "rgb(138, 145, 166)",
                        animation: "0.3s ease 0.85s 1 normal both running bpFade",
                      }}
                    >
                      <span>{"lodash-es"}</span>
                      <span>{"72 kb"}</span>
                    </span>{" "}
                    <span
                      data-anim="bpFade 0.3s ease 1.15s both"
                      style={{
                        opacity: "0",
                        display: "flex",
                        flexDirection: "row",
                        justifyContent: "space-between",
                        color: "rgb(121, 184, 255)",
                        fontWeight: "600",
                        animation: "0.3s ease 1.15s 1 normal both running bpFade",
                      }}
                    >
                      <span data-loop="tmGlow 4s ease 1.6s infinite">{"@cookieyes/dev"}</span>
                      <span>{"9 kb"}</span>
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                <div
                  data-anim="gfPop 0.35s cubic-bezier(0.34,1.56,0.64,1) 1.5s both"
                  style={{
                    opacity: "0",
                    position: "absolute",
                    right: "0px",
                    top: "0px",
                    borderRadius: "10px",
                    border: "1px solid rgb(231, 234, 244)",
                    background: "rgb(255, 255, 255)",
                    boxShadow: "rgba(20, 20, 42, 0.14) 0px 12px 28px",
                    padding: "var(--cy-space-8) var(--cy-space-12)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    zIndex: "1",
                    animation:
                      "0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s 1 normal both running gfPop",
                  }}
                >
                  {" "}
                  <span
                    style={{
                      fontSize: "9.5px",
                      lineHeight: "13px",
                      fontWeight: "600",
                      color: "rgb(20, 20, 42)",
                    }}
                  >
                    {"@cookieyes/dev"}
                  </span>{" "}
                  <span
                    style={{ fontSize: "8.5px", lineHeight: "11px", color: "var(--cy-accent)" }}
                  >
                    {"9 kb gzip · 0 deps"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "11px",
                  lineHeight: "16px",
                  letterSpacing: "1.5px",
                  color: "rgba(var(--cy-muted-rgb),0.55)",
                  textTransform: "uppercase",
                }}
              >
                {"Frontend only"}
              </span>{" "}
              <span
                style={{
                  padding: "var(--cy-space-8) 0 0",
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1.125rem",
                  lineHeight: "24px",
                  letterSpacing: "-0.3px",
                  color: "var(--cy-fg)",
                }}
              >
                {"Runs in your bundle"}
              </span>{" "}
              <span
                style={{
                  padding: "var(--cy-space-4) 0 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "0.875rem",
                  lineHeight: "21px",
                  color: "var(--cy-muted)",
                }}
              >
                {"No hosted runtime required for the banner and consent logic."}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <div
            className="cy-ill-card"
            style={{
              background: "var(--cy-surface)",
              border: "1px solid var(--cy-border)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--cy-space-20)",
              padding: "var(--cy-card-padding)",
              boxSizing: "border-box",
              minHeight: "292px",
              minWidth: "0px",
              transition: "background 0.25s",
            }}
          >
            {" "}
            <div
              className="cy-ill-gray"
              style={{
                flex: "1 1 0%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {" "}
              <div
                style={{
                  position: "relative",
                  width: "284px",
                  height: "158px",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                }}
              >
                {" "}
                <svg
                  viewBox="0 0 284 158"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: "0px",
                    width: "100%",
                    height: "100%",
                    overflow: "visible",
                  }}
                >
                  {" "}
                  <path
                    d="M 26 46 C 26 108, 88 130, 182 134"
                    data-anim="bpFade 0.5s ease 1.05s both"
                    style={{
                      opacity: "0",
                      fill: "none",
                      stroke: "rgb(199, 206, 224)",
                      strokeWidth: "1.5",
                      strokeLinecap: "round",
                      animation: "0.5s ease 1.05s 1 normal both running bpFade",
                    }}
                  />{" "}
                  <path
                    d="M 26 46 C 26 108, 88 130, 182 134"
                    pathLength="100"
                    className="gf-seg1"
                    data-anim="gfDraw 0.7s cubic-bezier(0.22,1,0.36,1) 1s both"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.8",
                      strokeLinecap: "round",
                      strokeDasharray: "102",
                      strokeDashoffset: "103",
                      animation:
                        "0.7s cubic-bezier(0.22, 1, 0.36, 1) 1s 1 normal both running gfDraw",
                    }}
                  />{" "}
                </svg>{" "}
                <div
                  className="bp-fade"
                  style={{
                    opacity: "0",
                    position: "absolute",
                    left: "0px",
                    top: "8px",
                    width: "208px",
                    borderRadius: "10px",
                    border: "1px solid rgb(231, 234, 244)",
                    background: "rgb(255, 255, 255)",
                    boxShadow: "rgba(20, 20, 42, 0.14) 0px 12px 28px",
                    padding: "var(--cy-space-8) var(--cy-space-12)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "var(--cy-space-8)",
                    animation: "0.5s ease 0s 1 normal forwards running bpFade",
                  }}
                >
                  {" "}
                  <span
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="6" cy="5" r="2.4" stroke="var(--cy-accent)" strokeWidth="2" />
                      <circle cx="6" cy="19" r="2.4" stroke="var(--cy-accent)" strokeWidth="2" />
                      <circle cx="18" cy="9" r="2.4" stroke="var(--cy-accent)" strokeWidth="2" />
                      <path
                        d="M6 7.5v9M6 12c6 0 9-0.5 12-4.5"
                        stroke="var(--cy-accent)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span
                      style={{
                        fontSize: "10px",
                        lineHeight: "14px",
                        fontWeight: "600",
                        color: "rgb(20, 20, 42)",
                      }}
                    >
                      {"cookieyes/dev"}
                    </span>
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "8.5px",
                      lineHeight: "11px",
                      letterSpacing: "0.5px",
                      fontWeight: "600",
                      color: "rgb(0, 117, 78)",
                      border: "1px solid rgba(0, 117, 78, 0.35)",
                      borderRadius: "999px",
                      padding: "2px 7px",
                    }}
                  >
                    {"MIT"}
                  </span>{" "}
                </div>{" "}
                <div
                  className="bp-fade"
                  style={{
                    opacity: "0",
                    position: "absolute",
                    left: "52px",
                    top: "56px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-4)",
                    fontSize: "8.5px",
                    lineHeight: "12px",
                    color: "rgba(var(--cy-muted-rgb),0.75)",
                    animation: "0.5s ease 0s 1 normal forwards running bpFade",
                  }}
                >
                  {" "}
                  <span>{"2,140 commits"}</span> <span>{"84 contributors"}</span>{" "}
                </div>{" "}
                <div
                  data-anim="gfPop 0.35s cubic-bezier(0.34,1.56,0.64,1) 1.55s both"
                  style={{
                    opacity: "0",
                    position: "absolute",
                    right: "0px",
                    bottom: "8px",
                    borderRadius: "10px",
                    border: "1px solid rgb(231, 234, 244)",
                    background: "rgb(255, 255, 255)",
                    boxShadow: "rgba(20, 20, 42, 0.14) 0px 12px 28px",
                    padding: "var(--cy-space-8) var(--cy-space-12)",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: "7px",
                    animation:
                      "0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 1.55s 1 normal both running gfPop",
                  }}
                >
                  {" "}
                  <span style={{ display: "flex", flexDirection: "row", gap: "4px" }}>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "var(--cy-accent)",
                      }}
                    />
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "rgba(var(--cy-accent-rgb),0.45)",
                      }}
                    />
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "10px",
                      lineHeight: "14px",
                      fontWeight: "600",
                      color: "var(--cy-accent)",
                    }}
                  >
                    {"your-fork"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "11px",
                  lineHeight: "16px",
                  letterSpacing: "1.5px",
                  color: "rgba(var(--cy-muted-rgb),0.55)",
                  textTransform: "uppercase",
                }}
              >
                {"MIT licensed"}
              </span>{" "}
              <span
                style={{
                  padding: "var(--cy-space-8) 0 0",
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1.125rem",
                  lineHeight: "24px",
                  letterSpacing: "-0.3px",
                  color: "var(--cy-fg)",
                }}
              >
                {"Fork it. Audit it. Self-host it."}
              </span>{" "}
              <span
                style={{
                  padding: "var(--cy-space-4) 0 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "0.875rem",
                  lineHeight: "21px",
                  color: "var(--cy-muted)",
                }}
              >
                {"No closed-source runtime dependency."}
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <div
            className="cy-ill-card"
            style={{
              background: "var(--cy-surface)",
              border: "1px solid var(--cy-border)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--cy-space-20)",
              padding: "var(--cy-card-padding)",
              boxSizing: "border-box",
              minHeight: "292px",
              minWidth: "0px",
              transition: "background 0.25s",
            }}
          >
            {" "}
            <div
              className="cy-ill-gray"
              style={{
                flex: "1 1 0%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {" "}
              <div
                className="bp-fade"
                style={{
                  opacity: "0",
                  position: "relative",
                  width: "284px",
                  height: "158px",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  animation: "0.5s ease 0s 1 normal forwards running bpFade",
                }}
              >
                {" "}
                <div
                  style={{
                    position: "absolute",
                    left: "0px",
                    top: "0px",
                    width: "252px",
                    borderRadius: "10px",
                    border: "1px solid rgb(231, 234, 244)",
                    background: "rgb(255, 255, 255)",
                    boxShadow: "rgba(20, 20, 42, 0.14) 0px 12px 28px",
                    overflow: "hidden",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--cy-space-8) var(--cy-space-12)",
                      background: "var(--cy-accent)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "9.5px",
                        lineHeight: "13px",
                        fontWeight: "600",
                        color: "rgb(255, 255, 255)",
                      }}
                    >
                      {"consent_records"}
                    </span>
                    <span
                      style={{
                        fontSize: "8px",
                        lineHeight: "11px",
                        color: "rgba(255, 255, 255, 0.75)",
                      }}
                    >
                      {"your db"}
                    </span>
                  </div>{" "}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1fr 1fr",
                      gap: "var(--cy-space-8)",
                      padding: "var(--cy-space-4) var(--cy-space-12)",
                      background: "rgb(247, 249, 253)",
                      borderBottom: "1px solid rgb(237, 240, 248)",
                      fontSize: "7px",
                      color: "rgb(143, 146, 175)",
                    }}
                  >
                    <span>{"timestamp"}</span>
                    <span>{"analytics"}</span>
                    <span>{"marketing"}</span>
                  </div>{" "}
                  <div style={{ position: "relative", height: "60px", overflow: "hidden" }}>
                    {" "}
                    <div
                      data-loop="tbFlash 15s ease 0.15s infinite"
                      style={{
                        position: "absolute",
                        top: "0px",
                        left: "0px",
                        right: "0px",
                        height: "20px",
                        zIndex: "0",
                        pointerEvents: "none",
                        background: "rgba(var(--cy-accent-rgb),0)",
                      }}
                    />{" "}
                    <div
                      className="tb-rows"
                      data-loop="tbFeed 15s cubic-bezier(0.45,0,0.15,1) 0.15s infinite"
                      style={{ position: "relative", zIndex: "1", transform: "translateY(0px)" }}
                    >
                      {" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:14:52"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                      </div>{" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:14:09"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                        <span style={{ fontSize: "7px", color: "rgb(185, 191, 212)" }}>
                          {"false"}
                        </span>
                      </div>{" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:13:35"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(185, 191, 212)" }}>
                          {"false"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(185, 191, 212)" }}>
                          {"false"}
                        </span>
                      </div>{" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:12:04"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                        <span style={{ fontSize: "7px", color: "rgb(185, 191, 212)" }}>
                          {"false"}
                        </span>
                      </div>{" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:11:47"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                      </div>{" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:10:31"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(185, 191, 212)" }}>
                          {"false"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                      </div>{" "}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1fr 1fr",
                          gap: "var(--cy-space-8)",
                          padding: "0 var(--cy-space-12)",
                          height: "20px",
                          alignItems: "center",
                          boxSizing: "border-box",
                          borderTop: "1px solid rgb(239, 242, 249)",
                        }}
                      >
                        <span style={{ fontSize: "7px", color: "rgb(143, 146, 175)" }}>
                          {"2026-07-15 09:09:58"}
                        </span>
                        <span style={{ fontSize: "7px", color: "rgb(20, 20, 42)" }}>{"true"}</span>
                        <span style={{ fontSize: "7px", color: "rgb(185, 191, 212)" }}>
                          {"false"}
                        </span>
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
                <div
                  data-anim="gfPop 0.35s cubic-bezier(0.34,1.56,0.64,1) 0.9s both"
                  style={{
                    opacity: "0",
                    position: "absolute",
                    right: "0px",
                    bottom: "4px",
                    borderRadius: "12px",
                    background: "rgb(23, 26, 33)",
                    boxShadow: "rgba(20, 20, 42, 0.22) 0px 16px 34px",
                    padding: "var(--cy-space-12) var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-4)",
                    zIndex: "1",
                    animation:
                      "0.35s cubic-bezier(0.34, 1.56, 0.64, 1) 0.9s 1 normal both running gfPop",
                  }}
                >
                  {" "}
                  <div style={{ display: "flex", flexDirection: "row", gap: "5px" }}>
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "rgb(255, 95, 87)",
                      }}
                    />
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "rgb(254, 188, 46)",
                      }}
                    />
                    <span
                      style={{
                        width: "7px",
                        height: "7px",
                        borderRadius: "50%",
                        background: "rgb(40, 200, 64)",
                      }}
                    />
                  </div>{" "}
                  <span
                    style={{ fontSize: "9.5px", lineHeight: "14px", color: "rgb(138, 145, 166)" }}
                  >
                    {"typed record"}
                  </span>{" "}
                  <span
                    style={{
                      fontSize: "9.5px",
                      lineHeight: "14px",
                      color: "rgb(230, 234, 243)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {"{ analytics: "}
                    <span
                      data-rec-bool=""
                      style={{
                        display: "inline-block",
                        width: "5ch",
                        color: "rgb(86, 211, 100)",
                        transition: "color 0.3s",
                      }}
                    >
                      {"true"}
                    </span>
                    {"}"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "11px",
                  lineHeight: "16px",
                  letterSpacing: "1.5px",
                  color: "rgba(var(--cy-muted-rgb),0.55)",
                  textTransform: "uppercase",
                }}
              >
                {"You hold the record"}
              </span>{" "}
              <span
                style={{
                  padding: "var(--cy-space-8) 0 0",
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1.125rem",
                  lineHeight: "24px",
                  letterSpacing: "-0.3px",
                  color: "var(--cy-fg)",
                }}
              >
                {"Your data, your storage"}
              </span>{" "}
              <span
                style={{
                  padding: "var(--cy-space-4) 0 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "0.875rem",
                  lineHeight: "21px",
                  color: "var(--cy-muted)",
                }}
              >
                {"Keep consent records in the infrastructure you already use."}
              </span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
