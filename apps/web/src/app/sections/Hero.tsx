// Ported from design/cydev/CookieYes Landing.dc.html — section "Hero".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function Hero() {
  return (
    <section
      className="cy-band-light"
      data-screen-label="Hero"
      style={{
        position: "relative",
        zIndex: "2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgb(248, 249, 250)",
      }}
    >
      {" "}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1152px",
          padding: "var(--cy-section-y) var(--cy-space-gutter) var(--cy-space-32)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        {" "}
        <div
          data-globe-mount="1"
          aria-hidden="true"
          style={{
            position: "absolute",
            right: "-30%",
            top: "-12%",
            width: "min(940px, 78vw)",
            height: "min(940px, 78vw)",
            zIndex: "-1",
            pointerEvents: "none",
          }}
        />{" "}
        <div
          style={{
            position: "fixed",
            left: "0px",
            top: "0px",
            zIndex: "40",
            opacity: "0",
            transform: "translate(-50%, -140%)",
            pointerEvents: "none",
            transition: "opacity 0.18s",
            padding: "var(--cy-space-4) var(--cy-space-8)",
            background: "rgba(8, 9, 11, 0.92)",
            border: "1px solid var(--cy-border)",
            boxShadow: "rgba(0, 0, 0, 0.4) 0px 8px 24px",
            whiteSpace: "nowrap",
            display: "flex",
            flexDirection: "row",
            gap: "var(--cy-space-8)",
            alignItems: "center",
          }}
        >
          {" "}
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "var(--cy-accent)",
            }}
          />{" "}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontSize: "11px",
              color: "var(--cy-fg)",
            }}
          />{" "}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontSize: "11px",
              color: "var(--cy-accent)",
            }}
          />{" "}
        </div>{" "}
        <a
          href="/docs/changelog"
          aria-label="What's new"
          className="scp4"
          style={{
            display: "inline-flex",
            flexDirection: "row",
            alignItems: "center",
            gap: "var(--cy-space-8)",
            padding: "6px 10px 6px 14px",
            borderRadius: "10px",
            border: "1px solid rgb(93, 210, 216)",
            background: "rgb(189, 244, 246)",
            textDecoration: "none",
            transition: "background 0.15s, border-color 0.15s",
          }}
        >
          {" "}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontWeight: "700",
              fontSize: "9px",
              lineHeight: "12px",
              letterSpacing: "1px",
              textTransform: "uppercase",
              color: "rgb(14, 70, 72)",
            }}
          >
            {"New"}
          </span>{" "}
          <span
            style={{
              fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
              fontWeight: "500",
              fontSize: "12px",
              lineHeight: "16px",
              color: "rgb(14, 70, 72)",
            }}
          >
            {"cookieyes v1.1 with 17 consent-gated integrations"}
          </span>{" "}
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            style={{ flexShrink: "0", color: "rgb(14, 70, 72)" }}
          >
            <path
              d="M6 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>{" "}
        </a>{" "}
        <h1
          style={{
            margin: "var(--cy-space-16) 0 var(--cy-space-28)",
            maxWidth: "560px",
            fontFamily: "Poppins, Inter, sans-serif",
            fontWeight: "500",
            fontSize: "3.5rem",
            lineHeight: "60.48px",
            letterSpacing: "-1.4px",
            color: "var(--cy-fg)",
            whiteSpace: "pre-line",
          }}
        >
          {"Consent that ships\nin your bundle."}
          <span
            data-hero-caret=""
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "4px",
              height: "0.74em",
              marginLeft: "10px",
              borderRadius: "1px",
              background: "var(--cy-accent)",
              verticalAlign: "-0.03em",
              animation: "1.1s steps(1) 0s infinite normal none running cyCursor",
            }}
          />
        </h1>{" "}
        <p
          style={{
            margin: "0px",
            padding: "var(--cy-space-4) 0 var(--cy-space-20)",
            maxWidth: "480px",
            fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
            fontWeight: "400",
            fontSize: "1.125rem",
            lineHeight: "29.25px",
            color: "var(--cy-muted)",
          }}
        >
          {
            "Open-source consent for React and Next.js. Manage consent in code, control when third-party tools load, and keep everything in your frontend."
          }
        </p>{" "}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "var(--cy-space-24) 0 var(--cy-space-32)",
            alignItems: "flex-start",
            width: "100%",
            maxWidth: "480px",
          }}
        >
          {" "}
          <div style={{ display: "flex", flexFlow: "wrap", gap: "var(--cy-space-12)" }}>
            {" "}
            <a
              href="/docs/getting-started/installation?pkg=nextjs"
              className="scp5 scp6"
              style={{
                height: "52px",
                padding: "0 var(--cy-space-24)",
                boxSizing: "border-box",
                borderRadius: "6px",
                background: "var(--cy-accent)",
                display: "inline-flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "var(--cy-space-8)",
                textDecoration: "none",
                color: "rgb(255, 255, 255)",
                boxShadow:
                  "rgba(255, 255, 255, 0.28) 0px 1px 0px inset, rgba(20, 20, 42, 0.18) 0px 1px 2px",
                transition: "background 0.2s, transform 0.12s",
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9 8.2 V15.8 M9 8.2 L15.4 16.6 M15 8.2 V12.8" />
              </svg>
              <span
                style={{
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1rem",
                  lineHeight: "20px",
                  letterSpacing: "0.1px",
                }}
              >
                {"Next.js"}
              </span>
            </a>{" "}
            <a
              href="/docs/getting-started/installation?pkg=react"
              className="scp7 scp6"
              style={{
                height: "52px",
                padding: "0 var(--cy-space-24)",
                boxSizing: "border-box",
                borderRadius: "6px",
                background: "var(--cy-surface)",
                border: "1px solid var(--cy-faint)",
                display: "inline-flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "var(--cy-space-8)",
                textDecoration: "none",
                color: "var(--cy-fg)",
                transition: "background 0.2s, border-color 0.2s, transform 0.12s",
              }}
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none" />
                <ellipse cx="12" cy="12" rx="10" ry="4" />
                <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" />
                <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" />
              </svg>
              <span
                style={{
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1rem",
                  lineHeight: "20px",
                  letterSpacing: "0.1px",
                }}
              >
                {"React"}
              </span>
            </a>{" "}
          </div>{" "}
          <div
            data-rsp="install-row"
            style={{
              marginTop: "var(--cy-space-20)",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "var(--cy-space-8)",
            }}
          >
            {" "}
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                height: "44px",
                padding: "0 var(--cy-space-16)",
                borderRadius: "4px",
                background: "rgba(var(--cy-muted-rgb),0.12)",
                boxSizing: "border-box",
                fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                fontWeight: "400",
                fontSize: "0.875rem",
                lineHeight: "20px",
                color: "var(--cy-fg)",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
            >
              {"npx "}
              <span className="sc-interp">{"@cookieyes/cli init"}</span>
            </span>{" "}
            <div
              aria-label="Copy command"
              role="button"
              tabIndex={0}
              className="scp8 scp9"
              style={{
                height: "44px",
                padding: "0 var(--cy-space-12)",
                borderRadius: "4px",
                display: "inline-flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "var(--cy-space-8)",
                cursor: "pointer",
                color: "rgba(var(--cy-muted-rgb),0.65)",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {" "}
              <span
                style={{
                  position: "relative",
                  width: "16px",
                  height: "16px",
                  display: "inline-flex",
                  flexShrink: "0",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "0px",
                    top: "0px",
                    opacity: "1",
                    transform: "scale(1)",
                    transition: "opacity 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  <rect
                    x="8"
                    y="8"
                    width="12"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "0px",
                    top: "0px",
                    opacity: "0",
                    transform: "scale(0.5)",
                    transition: "opacity 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  }}
                >
                  <path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    stroke="var(--cy-ok)"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>{" "}
              <span
                style={{
                  position: "relative",
                  display: "inline-flex",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "500",
                  fontSize: "1rem",
                  lineHeight: "20px",
                }}
              >
                <span aria-hidden="true" style={{ visibility: "hidden" }}>
                  {"Copied"}
                </span>
                <span style={{ position: "absolute", left: "0px", top: "0px" }}>
                  <span className="sc-interp">{"Copy"}</span>
                </span>
              </span>{" "}
            </div>{" "}
          </div>{" "}
          <a
            href="/docs"
            className="scp1"
            style={{
              marginTop: "var(--cy-space-16)",
              display: "inline-flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "var(--cy-space-8)",
              padding: "var(--cy-space-4) 0",
              fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
              fontWeight: "400",
              fontSize: "0.875rem",
              lineHeight: "20px",
              color: "rgba(var(--cy-muted-rgb),0.65)",
              textDecorationLine: "underline",
              textDecorationThickness: "initial",
              textDecorationStyle: "initial",
              textDecorationColor: "rgba(var(--cy-muted-rgb),0.3)",
              textUnderlineOffset: "4px",
              transition: "color 0.15s",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            {"Read documentation"}
          </a>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
