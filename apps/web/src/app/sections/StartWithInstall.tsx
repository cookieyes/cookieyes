// Ported from design/cydev/CookieYes Landing.dc.html — section "CTA Start with install".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
import type { CSSProperties } from "react";

export function StartWithInstall() {
  return (
    <section
      className="cy-band-light"
      data-screen-label="CTA Start with install"
      style={
        {
          position: "relative",
          zIndex: "1",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          "--cy-section-y": "calc(var(--cy-space-section) + 80px)",
          background: "rgb(248, 249, 250)",
        } as CSSProperties
      }
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
        data-card="1"
        style={{
          position: "relative",
          width: "calc(100% - var(--cy-space-gutter) * 2)",
          maxWidth: "1152px",
          margin: "var(--cy-space-section) 0",
          padding: "var(--cy-space-96, 96px) var(--cy-space-48)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          background: "var(--cy-surface)",
          border: "1px solid rgb(227, 229, 241)",
          borderRadius: "16px",
          overflow: "hidden",
        }}
      >
        {" "}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: "0px",
            pointerEvents: "none",
            zIndex: "0",
            background: "linear-gradient(rgba(241, 246, 253, 0) 0%, rgb(241, 246, 253) 100%)",
          }}
        />{" "}
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
            zIndex: "0",
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
        <canvas
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "0px",
            top: "40px",
            width: "760px",
            maxWidth: "100%",
            height: "280px",
            zIndex: "-1",
            pointerEvents: "none",
          }}
          width="760"
          height="280"
        />{" "}
        <div
          aria-hidden="true"
          data-rsp="cta-ill"
          style={{
            position: "absolute",
            inset: "0px 24px 0px 648px",
            overflow: "visible",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {" "}
          <div
            className="cy-ent"
            style={{
              position: "relative",
              width: "388px",
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "var(--cy-space-12)",
              transitionDelay: "0.1s",
            }}
          >
            {" "}
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "436px",
                overflow: "hidden",
                maskImage: "linear-gradient(transparent 0%, black 5%, black 95%, transparent 100%)",
              }}
            >
              {" "}
              <div
                data-cta-slot=""
                data-cb-card=""
                style={{
                  position: "absolute",
                  left: "20px",
                  right: "20px",
                  top: "0px",
                  height: "156px",
                  border: "1px solid var(--cy-border)",
                  boxSizing: "border-box",
                  background: "var(--cy-surface)",
                  boxShadow:
                    "rgba(20, 20, 42, 0.04) 0px 1px 2px, rgba(20, 20, 42, 0.05) 0px 3px 10px",
                  transform: "translateY(0px) scale(0.64)",
                  willChange: "transform",
                  transition: "none",
                  zIndex: "1",
                  opacity: "1",
                }}
              >
                {" "}
                <div
                  data-sk=""
                  style={{
                    opacity: "1",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s",
                  }}
                >
                  <span
                    style={{
                      height: "10px",
                      width: "46%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.11)",
                    }}
                  />
                  <span
                    style={{
                      marginTop: "4px",
                      height: "7px",
                      width: "78%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <span
                    style={{
                      height: "7px",
                      width: "62%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        height: "26px",
                        width: "78px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.08)",
                      }}
                    />
                    <span
                      style={{
                        height: "26px",
                        width: "88px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.13)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginTop: "6px",
                      height: "6px",
                      width: "96px",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                </div>{" "}
                <div
                  data-ct=""
                  style={{
                    opacity: "0",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "500",
                        fontSize: "0.8125rem",
                        lineHeight: "18px",
                        color: "var(--cy-fg)",
                      }}
                    >
                      {"Your privacy choices."}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "var(--cy-accent)",
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "8px",
                        lineHeight: "12px",
                        letterSpacing: "0.5px",
                        color: "rgb(255, 255, 255)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"CCPA · California"}
                    </span>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: "400",
                      fontSize: "11px",
                      lineHeight: "16px",
                      color: "var(--cy-muted)",
                    }}
                  >
                    {"We use cookies for analytics and ads measurement. Opt out any time."}
                  </span>{" "}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        background: "var(--cy-accent)",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--cy-bg)",
                      }}
                    >
                      {"OK, got it"}
                    </div>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontSize: "10px",
                      lineHeight: "14px",
                      fontWeight: "500",
                      color: "var(--cy-muted)",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {"Do Not Sell or Share My Personal Information"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <div
                data-cta-slot=""
                data-cb-card=""
                style={{
                  position: "absolute",
                  left: "20px",
                  right: "20px",
                  top: "0px",
                  height: "156px",
                  border: "1px solid var(--cy-border)",
                  boxSizing: "border-box",
                  background: "var(--cy-surface)",
                  boxShadow:
                    "rgba(20, 20, 42, 0.06) 0px 2px 6px, rgba(20, 20, 42, 0.13) 0px 6px 28px",
                  transform: "translateY(140px) scale(1)",
                  willChange: "transform",
                  transition: "none",
                  zIndex: "2",
                  opacity: "1",
                }}
              >
                {" "}
                <div
                  data-sk=""
                  style={{
                    opacity: "0",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s 0.25s",
                  }}
                >
                  <span
                    style={{
                      height: "10px",
                      width: "46%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.11)",
                    }}
                  />
                  <span
                    style={{
                      marginTop: "4px",
                      height: "7px",
                      width: "78%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <span
                    style={{
                      height: "7px",
                      width: "62%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        height: "26px",
                        width: "78px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.08)",
                      }}
                    />
                    <span
                      style={{
                        height: "26px",
                        width: "88px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.13)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginTop: "6px",
                      height: "6px",
                      width: "96px",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                </div>{" "}
                <div
                  data-ct=""
                  style={{
                    opacity: "1",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s 0.25s",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "500",
                        fontSize: "0.8125rem",
                        lineHeight: "18px",
                        color: "var(--cy-fg)",
                      }}
                    >
                      {"This site uses cookies."}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "var(--cy-accent)",
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "8px",
                        lineHeight: "12px",
                        letterSpacing: "0.5px",
                        color: "rgb(255, 255, 255)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"GDPR · EU"}
                    </span>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: "400",
                      fontSize: "11px",
                      lineHeight: "16px",
                      color: "var(--cy-muted)",
                    }}
                  >
                    {"Required ones are always on. Analytics and marketing need your yes first."}
                  </span>{" "}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        border: "1px solid var(--cy-border)",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "500",
                        color: "var(--cy-muted)",
                      }}
                    >
                      {"Reject all"}
                    </div>
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        background: "var(--cy-accent)",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--cy-bg)",
                      }}
                    >
                      {"Accept all"}
                    </div>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontSize: "10px",
                      lineHeight: "14px",
                      fontWeight: "500",
                      color: "var(--cy-muted)",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {"Manage preferences"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <div
                data-cta-slot=""
                data-cb-card=""
                style={{
                  position: "absolute",
                  left: "20px",
                  right: "20px",
                  top: "0px",
                  height: "156px",
                  border: "1px solid var(--cy-border)",
                  boxSizing: "border-box",
                  background: "var(--cy-surface)",
                  boxShadow:
                    "rgba(20, 20, 42, 0.04) 0px 1px 2px, rgba(20, 20, 42, 0.05) 0px 3px 10px",
                  transform: "translateY(280px) scale(0.64)",
                  willChange: "transform",
                  transition: "none",
                  zIndex: "1",
                  opacity: "1",
                }}
              >
                {" "}
                <div
                  data-sk=""
                  style={{
                    opacity: "1",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s",
                  }}
                >
                  <span
                    style={{
                      height: "10px",
                      width: "46%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.11)",
                    }}
                  />
                  <span
                    style={{
                      marginTop: "4px",
                      height: "7px",
                      width: "78%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <span
                    style={{
                      height: "7px",
                      width: "62%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        height: "26px",
                        width: "78px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.08)",
                      }}
                    />
                    <span
                      style={{
                        height: "26px",
                        width: "88px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.13)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginTop: "6px",
                      height: "6px",
                      width: "96px",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                </div>{" "}
                <div
                  data-ct=""
                  style={{
                    opacity: "0",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "500",
                        fontSize: "0.8125rem",
                        lineHeight: "18px",
                        color: "var(--cy-fg)",
                      }}
                    >
                      {"Cookies e consentimento."}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "var(--cy-accent)",
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "8px",
                        lineHeight: "12px",
                        letterSpacing: "0.5px",
                        color: "rgb(255, 255, 255)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"LGPD · Brasil"}
                    </span>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: "400",
                      fontSize: "11px",
                      lineHeight: "16px",
                      color: "var(--cy-muted)",
                    }}
                  >
                    {"Usamos cookies de análise e marketing somente com o seu consentimento."}
                  </span>{" "}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        border: "1px solid var(--cy-border)",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "500",
                        color: "var(--cy-muted)",
                      }}
                    >
                      {"Rejeitar"}
                    </div>
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        background: "var(--cy-accent)",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--cy-bg)",
                      }}
                    >
                      {"Aceitar tudo"}
                    </div>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontSize: "10px",
                      lineHeight: "14px",
                      fontWeight: "500",
                      color: "var(--cy-muted)",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {"Gerenciar preferências"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
              <div
                data-cta-slot=""
                data-cb-card=""
                style={{
                  position: "absolute",
                  left: "20px",
                  right: "20px",
                  top: "0px",
                  height: "156px",
                  border: "1px solid var(--cy-border)",
                  boxSizing: "border-box",
                  background: "var(--cy-surface)",
                  boxShadow:
                    "rgba(20, 20, 42, 0.04) 0px 1px 2px, rgba(20, 20, 42, 0.05) 0px 3px 10px",
                  transform: "translateY(-140px) scale(0.64)",
                  willChange: "transform",
                  transition: "none",
                  zIndex: "1",
                  opacity: "0",
                }}
              >
                {" "}
                <div
                  data-sk=""
                  style={{
                    opacity: "1",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s",
                  }}
                >
                  <span
                    style={{
                      height: "10px",
                      width: "46%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.11)",
                    }}
                  />
                  <span
                    style={{
                      marginTop: "4px",
                      height: "7px",
                      width: "78%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <span
                    style={{
                      height: "7px",
                      width: "62%",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        height: "26px",
                        width: "78px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.08)",
                      }}
                    />
                    <span
                      style={{
                        height: "26px",
                        width: "88px",
                        borderRadius: "4px",
                        background: "rgba(var(--cy-fg-rgb),0.13)",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      marginTop: "6px",
                      height: "6px",
                      width: "96px",
                      borderRadius: "3px",
                      background: "rgba(var(--cy-fg-rgb),0.07)",
                    }}
                  />
                </div>{" "}
                <div
                  data-ct=""
                  style={{
                    opacity: "0",
                    position: "absolute",
                    inset: "0px",
                    padding: "var(--cy-space-16)",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "var(--cy-space-8)",
                    transition: "opacity 0.4s",
                  }}
                >
                  {" "}
                  <div
                    style={{
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "500",
                        fontSize: "0.8125rem",
                        lineHeight: "18px",
                        color: "var(--cy-fg)",
                      }}
                    >
                      {"We value your privacy."}
                    </span>
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: "999px",
                        background: "var(--cy-accent)",
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "8px",
                        lineHeight: "12px",
                        letterSpacing: "0.5px",
                        color: "rgb(255, 255, 255)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"PIPEDA · Canada"}
                    </span>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontWeight: "400",
                      fontSize: "11px",
                      lineHeight: "16px",
                      color: "var(--cy-muted)",
                    }}
                  >
                    {"Analytics and marketing cookies stay off until you allow them."}
                  </span>{" "}
                  <div
                    style={{
                      marginTop: "auto",
                      display: "flex",
                      flexDirection: "row",
                      gap: "var(--cy-space-8)",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        border: "1px solid var(--cy-border)",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "500",
                        color: "var(--cy-muted)",
                      }}
                    >
                      {"Decline"}
                    </div>
                    <div
                      style={{
                        height: "30px",
                        borderRadius: "4px",
                        padding: "0 var(--cy-space-16)",
                        background: "var(--cy-accent)",
                        display: "flex",
                        alignItems: "center",
                        whiteSpace: "nowrap",
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        fontWeight: "600",
                        color: "var(--cy-bg)",
                      }}
                    >
                      {"Allow all"}
                    </div>
                  </div>{" "}
                  <span
                    style={{
                      fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                      fontSize: "10px",
                      lineHeight: "14px",
                      fontWeight: "500",
                      color: "var(--cy-muted)",
                      textDecoration: "underline",
                      textUnderlineOffset: "3px",
                    }}
                  >
                    {"Manage preferences"}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div
          style={{
            position: "relative",
            zIndex: "1",
            maxWidth: "576px",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          {" "}
          <h2
            style={{
              margin: "0px",
              fontFamily: "Poppins, Inter, sans-serif",
              fontWeight: "500",
              fontSize: "2.25rem",
              lineHeight: "40px",
              letterSpacing: "-0.9px",
              color: "var(--cy-fg)",
            }}
          >
            {"Start with install."}
          </h2>{" "}
          <p
            style={{
              margin: "var(--cy-space-16) 0 0",
              fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
              fontWeight: "400",
              fontSize: "1rem",
              lineHeight: "26px",
              color: "var(--cy-muted)",
              maxWidth: "400px",
              textWrap: "pretty",
            }}
          >
            {"No account. No dashboard. Install the package and add consent directly to your site."}
          </p>{" "}
          <div
            style={{
              marginTop: "var(--cy-space-32)",
              display: "flex",
              flexDirection: "column",
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
                      transition:
                        "opacity 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
                      transition:
                        "opacity 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
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
      </div>{" "}
    </section>
  );
}
