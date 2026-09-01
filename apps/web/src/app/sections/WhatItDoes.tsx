// Ported from design/cydev/CookieYes Landing.dc.html — section "02 What it does".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
import type { CSSProperties } from "react";

export function WhatItDoes() {
  return (
    <section
      className="cy-band-light section--beveled"
      data-screen-label="02 What it does"
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
              {"What it does"}
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
              {"Feature-complete consent, with the control surface a serious project needs."}
            </p>{" "}
          </div>{" "}
        </div>{" "}
        <div
          style={{
            width: "100%",
            margin: "var(--cy-space-group) 0 0",
            display: "flex",
            flexDirection: "column",
            gap: "var(--cy-space-12)",
          }}
        >
          {" "}
          <div
            data-rsp="bento-cols"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "var(--cy-space-12)",
              alignItems: "stretch",
            }}
          >
            {" "}
            <div
              data-bento="0"
              style={{
                background: "var(--cy-surface)",
                border: "1px solid rgb(227, 229, 241)",
                borderRadius: "16px",
                padding: "var(--cy-space-24)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: "var(--cy-space-24)",
                minWidth: "0px",
                overflow: "hidden",
              }}
            >
              {" "}
              <div
                style={{
                  flex: "0 0 190px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "var(--cy-space-8)",
                  padding: "var(--cy-space-8) 0 var(--cy-space-8) var(--cy-space-8)",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "11px",
                    lineHeight: "16px",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(var(--cy-muted-rgb),0.55)",
                  }}
                >
                  {"Geolocation"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: "Poppins, Inter, sans-serif",
                    fontWeight: "500",
                    fontSize: "1.375rem",
                    lineHeight: "28px",
                    letterSpacing: "-0.4px",
                    color: "var(--cy-fg)",
                    textWrap: "pretty",
                  }}
                >
                  {"Region-aware consent"}
                </span>{" "}
                <span
                  style={{
                    marginTop: "var(--cy-space-4)",
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.875rem",
                    lineHeight: "21px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {
                    "Pass the visitor’s region and CookieYes applies the right consent experience automatically."
                  }
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  flex: "1 1 0px",
                  minWidth: "0px",
                  minHeight: "280px",
                  padding: "var(--cy-space-28)",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  background:
                    "radial-gradient(66% 66% at 83% 104%, rgba(217, 196, 233, 0.2) 0%, rgba(108, 155, 234, 0.2) 70%, rgba(24, 99, 220, 0.02) 100%), rgb(248, 248, 249)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {" "}
                <div
                  data-geo="1"
                  data-fit="300"
                  className="cy-ent"
                  style={{
                    position: "relative",
                    width: "300px",
                    flexShrink: "0",
                    height: "310px",
                    overflow: "hidden",
                    transform: "scale(0.673)",
                    transformOrigin: "center center",
                  }}
                >
                  {" "}
                  <canvas
                    data-geo-cv=""
                    aria-hidden="true"
                    style={{
                      position: "absolute",
                      left: "0px",
                      top: "18px",
                      width: "300px",
                      height: "292px",
                    }}
                    width="600"
                    height="584"
                  />{" "}
                  <div
                    style={{
                      position: "absolute",
                      right: "0px",
                      top: "10px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-4)",
                      padding: "5px 10px",
                      borderRadius: "999px",
                      background: "var(--cy-accent)",
                      boxShadow: "0 6px 16px rgba(var(--cy-accent-rgb),0.35)",
                      fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                      fontSize: "9px",
                      lineHeight: "12px",
                      color: "rgba(255, 255, 255, 0.75)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {"x-region: "}
                    <span
                      data-geo-val=""
                      style={{
                        color: "rgb(255, 255, 255)",
                        fontWeight: "600",
                        transition: "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      {"eu"}
                    </span>
                  </div>{" "}
                  <div
                    style={{
                      position: "absolute",
                      right: "6px",
                      bottom: "16px",
                      width: "76px",
                      borderRadius: "8px",
                      background: "rgb(23, 26, 33)",
                      padding: "var(--cy-space-8) var(--cy-space-8)",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--cy-space-4)",
                    }}
                  >
                    <span
                      data-geo-law=""
                      style={{
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "8px",
                        lineHeight: "10px",
                        color: "rgb(230, 234, 243)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        transition: "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      {"gdpr"}
                    </span>
                    <span
                      style={{
                        height: "3px",
                        width: "100%",
                        borderRadius: "2px",
                        background: "rgba(255, 255, 255, 0.28)",
                      }}
                    />
                    <span
                      style={{
                        height: "3px",
                        width: "70%",
                        borderRadius: "2px",
                        background: "rgba(255, 255, 255, 0.28)",
                      }}
                    />
                    <span
                      style={{
                        marginTop: "2px",
                        height: "8px",
                        width: "26px",
                        borderRadius: "2px",
                        background: "rgba(255, 255, 255, 0.42)",
                      }}
                    />
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div
              data-bento="2"
              style={{
                background: "var(--cy-surface)",
                border: "1px solid rgb(227, 229, 241)",
                borderRadius: "16px",
                padding: "var(--cy-space-24)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: "var(--cy-space-24)",
                minWidth: "0px",
                overflow: "hidden",
              }}
            >
              {" "}
              <div
                style={{
                  flex: "0 0 190px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "var(--cy-space-8)",
                  padding: "var(--cy-space-8) 0 var(--cy-space-8) var(--cy-space-8)",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "11px",
                    lineHeight: "16px",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(var(--cy-muted-rgb),0.55)",
                  }}
                >
                  {"Multilanguage"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: "Poppins, Inter, sans-serif",
                    fontWeight: "500",
                    fontSize: "1.375rem",
                    lineHeight: "28px",
                    letterSpacing: "-0.4px",
                    color: "var(--cy-fg)",
                    textWrap: "pretty",
                  }}
                >
                  {"Built-in i18n"}
                </span>{" "}
                <span
                  style={{
                    marginTop: "var(--cy-space-4)",
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.875rem",
                    lineHeight: "21px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {
                    "Localized without the bundle bloat. Load the locale you need and override any banner copy per language."
                  }
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  flex: "1 1 0px",
                  minWidth: "0px",
                  minHeight: "280px",
                  padding: "var(--cy-space-28)",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  background:
                    "radial-gradient(66% 66% at 83% 104%, rgba(217, 196, 233, 0.2) 0%, rgba(108, 155, 234, 0.2) 70%, rgba(24, 99, 220, 0.02) 100%), rgb(248, 248, 249)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {" "}
                <div
                  data-i18n="1"
                  data-fit="300"
                  className="cy-ent"
                  style={{
                    position: "relative",
                    width: "300px",
                    flexShrink: "0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "stretch",
                    gap: "0px",
                    boxSizing: "border-box",
                    transform: "scale(0.673)",
                    transformOrigin: "center center",
                  }}
                >
                  {" "}
                  <div
                    data-i18n-menu=""
                    style={{
                      alignSelf: "center",
                      borderRadius: "10px",
                      background: "rgb(23, 26, 33)",
                      boxShadow: "rgba(20, 20, 42, 0.28) 0px 14px 30px",
                      padding: "var(--cy-space-4)",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      minWidth: "118px",
                    }}
                  >
                    {" "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 11px",
                        borderRadius: "6px",
                        background: "transparent",
                        color: "rgba(230, 234, 243, 0.6)",
                        transition: "background 0.3s, color 0.3s",
                      }}
                    >
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 21 14"
                        aria-hidden="true"
                        style={{
                          flexShrink: "0",
                          borderRadius: "2px",
                          boxShadow: "rgba(255, 255, 255, 0.12) 0px 0px 0px 1px",
                        }}
                      >
                        <rect width="21" height="14" fill="#012169" />
                        <path d="M0 0L21 14M21 0L0 14" stroke="#FFFFFF" strokeWidth="2.8" />
                        <path d="M0 0L21 14M21 0L0 14" stroke="#C8102E" strokeWidth="1.2" />
                        <rect x="8.4" width="4.2" height="14" fill="#FFFFFF" />
                        <rect y="4.9" width="21" height="4.2" fill="#FFFFFF" />
                        <rect x="9.1" width="2.8" height="14" fill="#C8102E" />
                        <rect y="5.6" width="21" height="2.8" fill="#C8102E" />
                      </svg>
                      <span
                        style={{
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "10.5px",
                          lineHeight: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {"English"}
                      </span>
                    </div>{" "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 11px",
                        borderRadius: "6px",
                        background: "rgba(255, 255, 255, 0.1)",
                        color: "rgb(121, 184, 255)",
                        transition: "background 0.3s, color 0.3s",
                      }}
                    >
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 21 14"
                        aria-hidden="true"
                        style={{
                          flexShrink: "0",
                          borderRadius: "2px",
                          boxShadow: "rgba(255, 255, 255, 0.12) 0px 0px 0px 1px",
                        }}
                      >
                        <rect width="21" height="14" fill="#141414" />
                        <rect y="4.67" width="21" height="4.67" fill="#DD0000" />
                        <rect y="9.34" width="21" height="4.66" fill="#FFCC00" />
                      </svg>
                      <span
                        style={{
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "10.5px",
                          lineHeight: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {"Deutsch"}
                      </span>
                    </div>{" "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 11px",
                        borderRadius: "6px",
                        background: "transparent",
                        color: "rgba(230, 234, 243, 0.6)",
                        transition: "background 0.3s, color 0.3s",
                      }}
                    >
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 21 14"
                        aria-hidden="true"
                        style={{
                          flexShrink: "0",
                          borderRadius: "2px",
                          boxShadow: "rgba(255, 255, 255, 0.12) 0px 0px 0px 1px",
                        }}
                      >
                        <rect width="21" height="14" fill="#FFFFFF" />
                        <rect width="7" height="14" fill="#002395" />
                        <rect x="14" width="7" height="14" fill="#ED2939" />
                      </svg>
                      <span
                        style={{
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "10.5px",
                          lineHeight: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {"Français"}
                      </span>
                    </div>{" "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 11px",
                        borderRadius: "6px",
                        background: "transparent",
                        color: "rgba(230, 234, 243, 0.6)",
                        transition: "background 0.3s, color 0.3s",
                      }}
                    >
                      <svg
                        width="14"
                        height="10"
                        viewBox="0 0 21 14"
                        aria-hidden="true"
                        style={{
                          flexShrink: "0",
                          borderRadius: "2px",
                          boxShadow: "rgba(255, 255, 255, 0.12) 0px 0px 0px 1px",
                        }}
                      >
                        <rect width="21" height="14" fill="#FFFFFF" />
                        <rect width="7" height="14" fill="#009246" />
                        <rect x="14" width="7" height="14" fill="#CE2B37" />
                      </svg>
                      <span
                        style={{
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "10.5px",
                          lineHeight: "14px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {"Italiano"}
                      </span>
                    </div>{" "}
                  </div>{" "}
                  <svg
                    aria-hidden="true"
                    width="14"
                    height="20"
                    viewBox="0 0 14 20"
                    fill="none"
                    style={{ alignSelf: "center", display: "block", flexShrink: "0" }}
                  >
                    <path
                      d="M7 1.5 C 7 7, 7 11, 7 15"
                      stroke="rgba(19,111,232,0.75)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <circle cx="7" cy="17" r="2" fill="rgba(19,111,232,0.75)" />
                  </svg>{" "}
                  <div
                    style={{
                      alignSelf: "stretch",
                      borderRadius: "12px",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.16) 0px 16px 34px",
                      padding: "var(--cy-space-20)",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--cy-space-8)",
                    }}
                  >
                    {" "}
                    <span
                      data-i18n-title=""
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "400",
                        fontSize: "14.5px",
                        lineHeight: "20px",
                        color: "rgb(20, 20, 42)",
                        transition: "opacity 0.25s",
                      }}
                    >
                      {"Diese Website verwendet Cookies."}
                    </span>{" "}
                    <span
                      data-i18n-body=""
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "400",
                        fontSize: "11.5px",
                        lineHeight: "16.5px",
                        color: "rgb(110, 113, 145)",
                        transition: "opacity 0.25s",
                      }}
                    >
                      {"Notwendige sind immer aktiv. Analyse und Marketing erst nach Zustimmung."}
                    </span>{" "}
                    <div
                      style={{
                        marginTop: "var(--cy-space-4)",
                        display: "flex",
                        flexFlow: "wrap",
                        alignItems: "center",
                        gap: "var(--cy-space-8)",
                      }}
                    >
                      {" "}
                      <span
                        data-i18n-reject=""
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          border: "1px solid rgb(227, 229, 241)",
                          boxSizing: "border-box",
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "11.5px",
                          lineHeight: "16.5px",
                          color: "var(--cy-muted)",
                          whiteSpace: "nowrap",
                          transition: "opacity 0.25s",
                        }}
                      >
                        {"Alle ablehnen"}
                      </span>{" "}
                      <span
                        data-i18n-accept=""
                        style={{
                          padding: "6px 14px",
                          borderRadius: "6px",
                          background: "var(--cy-accent)",
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "11.5px",
                          lineHeight: "16.5px",
                          color: "rgb(255, 255, 255)",
                          whiteSpace: "nowrap",
                          transition: "opacity 0.25s",
                        }}
                      >
                        {"Alle akzeptieren"}
                      </span>{" "}
                    </div>{" "}
                    <span
                      data-i18n-manage=""
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontWeight: "400",
                        fontSize: "11px",
                        lineHeight: "15px",
                        color: "rgb(110, 113, 145)",
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                        transition: "opacity 0.25s",
                      }}
                    >
                      {"Einstellungen verwalten"}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
            <div
              data-bento="3"
              style={{
                background: "var(--cy-surface)",
                border: "1px solid rgb(227, 229, 241)",
                borderRadius: "16px",
                padding: "var(--cy-space-24)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: "var(--cy-space-24)",
                minWidth: "0px",
                overflow: "hidden",
              }}
            >
              {" "}
              <div
                style={{
                  flex: "0 0 190px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "var(--cy-space-8)",
                  padding: "var(--cy-space-8) 0 var(--cy-space-8) var(--cy-space-8)",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "11px",
                    lineHeight: "16px",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(var(--cy-muted-rgb),0.55)",
                  }}
                >
                  {"Styling"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: "Poppins, Inter, sans-serif",
                    fontWeight: "500",
                    fontSize: "1.375rem",
                    lineHeight: "28px",
                    letterSpacing: "-0.4px",
                    color: "var(--cy-fg)",
                    textWrap: "pretty",
                  }}
                >
                  {"Full CSS control"}
                </span>{" "}
                <span
                  style={{
                    marginTop: "var(--cy-space-4)",
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.875rem",
                    lineHeight: "21px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {
                    "Customise styles, colours, spacing, and components without being locked into the default design."
                  }
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  flex: "1 1 0px",
                  minWidth: "0px",
                  minHeight: "280px",
                  padding: "var(--cy-space-28)",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  background:
                    "radial-gradient(66% 66% at 83% 104%, rgba(217, 196, 233, 0.2) 0%, rgba(108, 155, 234, 0.2) 70%, rgba(24, 99, 220, 0.02) 100%), rgb(248, 248, 249)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {" "}
                <div
                  data-css="1"
                  data-fit="316"
                  style={{
                    position: "relative",
                    width: "316px",
                    height: "250px",
                    flexShrink: "0",
                    transform: "scale(0.639)",
                    transformOrigin: "center center",
                  }}
                >
                  {" "}
                  <svg
                    aria-hidden="true"
                    width="92"
                    height="92"
                    viewBox="0 0 92 92"
                    fill="none"
                    style={{
                      position: "absolute",
                      left: "30px",
                      top: "81px",
                      pointerEvents: "none",
                    }}
                  >
                    <path
                      d="M10 0 C 10 38, 42 79, 82 83"
                      stroke="rgba(19,111,232,0.75)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <circle cx="86" cy="83" r="2" fill="rgba(19,111,232,0.75)" />
                  </svg>{" "}
                  <div
                    className="cy-ent"
                    style={{
                      position: "absolute",
                      left: "0px",
                      top: "8px",
                      width: "188px",
                      borderRadius: "12px",
                      background: "rgb(23, 26, 33)",
                      boxShadow: "rgba(20, 20, 42, 0.12) 0px 6px 16px",
                      padding: "var(--cy-space-12) var(--cy-space-16)",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--cy-space-8)",
                      zIndex: "1",
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
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "10.5px",
                        lineHeight: "16.5px",
                      }}
                    >
                      {" "}
                      <div style={{ color: "rgb(138, 145, 166)" }}>{".cy-banner {"}</div>{" "}
                      <div
                        style={{
                          paddingLeft: "14px",
                          display: "flex",
                          flexDirection: "row",
                          alignItems: "center",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <span
                          data-css-prop=""
                          style={{
                            color: "rgb(201, 212, 240)",
                            transition: "opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1)",
                          }}
                        >
                          {"--cy-radius"}
                        </span>
                        <span style={{ color: "rgb(138, 145, 166)" }}>{": "}</span>
                        <span data-css-val="" style={{ color: "rgb(121, 184, 255)" }}>
                          {"12px"}
                        </span>
                        <span
                          data-css-caret=""
                          style={{
                            display: "inline-block",
                            width: "2px",
                            height: "11px",
                            marginLeft: "1px",
                            background: "var(--cy-accent)",
                          }}
                        />
                        <span style={{ color: "rgb(138, 145, 166)" }}>{";"}</span>
                      </div>{" "}
                      <div style={{ color: "rgb(138, 145, 166)" }}>{"}"}</div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div
                    className="cy-ent"
                    style={{
                      position: "absolute",
                      right: "0px",
                      bottom: "8px",
                      width: "200px",
                      zIndex: "2",
                      transitionDelay: "0.15s",
                    }}
                  >
                    {" "}
                    <div
                      data-css-panel=""
                      data-cb-card=""
                      style={{
                        alignSelf: "stretch",
                        borderRadius: "4px",
                        border: "1px solid rgb(231, 234, 244)",
                        boxSizing: "border-box",
                        background: "rgb(255, 255, 255)",
                        boxShadow: "rgba(20, 20, 42, 0.14) 0px 12px 28px",
                        padding: "15.7px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-start",
                        transition: "background 1s",
                      }}
                    >
                      {" "}
                      <span
                        style={{
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "700",
                          fontSize: "10.7px",
                          lineHeight: "13.9px",
                          color: "rgb(20, 20, 42)",
                        }}
                      >
                        {"This site uses cookies."}
                      </span>{" "}
                      <span
                        style={{
                          marginTop: "6.7px",
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "400",
                          fontSize: "8.2px",
                          lineHeight: "12px",
                          color: "rgba(20, 20, 42, 0.62)",
                        }}
                      >
                        {
                          "Required ones are always on. Analytics and marketing need your yes first."
                        }
                      </span>{" "}
                      <div
                        style={{
                          marginTop: "7.6px",
                          alignSelf: "stretch",
                          display: "flex",
                          flexDirection: "row",
                          gap: "7.4px",
                        }}
                      >
                        {" "}
                        <div
                          data-css-btn2=""
                          style={{
                            flex: "1 1 0%",
                            height: "24.1px",
                            borderRadius: "4px",
                            border: "1px solid rgba(20, 20, 42, 0.22)",
                            boxSizing: "border-box",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                            fontSize: "7.9px",
                            fontWeight: "500",
                            color: "rgb(78, 75, 102)",
                          }}
                        >
                          {"Reject all"}
                        </div>{" "}
                        <div
                          data-css-btn=""
                          style={{
                            flex: "1 1 0%",
                            height: "24.1px",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                            fontSize: "7.9px",
                            fontWeight: "600",
                            color: "rgb(255, 255, 255)",
                            background: "rgb(19, 111, 232)",
                            boxShadow: "rgba(255, 255, 255, 0.3) 0px 1px 0px inset",
                            transition: "background 0.5s, box-shadow 0.5s",
                          }}
                        >
                          {"Accept all"}
                        </div>{" "}
                      </div>{" "}
                      <span
                        style={{
                          marginTop: "7.4px",
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontSize: "7.4px",
                          lineHeight: "10.2px",
                          fontWeight: "500",
                          color: "rgba(20, 20, 42, 0.5)",
                          textDecoration: "underline",
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
              data-bento="5"
              style={{
                background: "var(--cy-surface)",
                border: "1px solid rgb(227, 229, 241)",
                borderRadius: "16px",
                padding: "var(--cy-space-24)",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: "var(--cy-space-24)",
                minWidth: "0px",
                overflow: "hidden",
              }}
            >
              {" "}
              <div
                style={{
                  flex: "0 0 190px",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "var(--cy-space-8)",
                  padding: "var(--cy-space-8) 0 var(--cy-space-8) var(--cy-space-8)",
                }}
              >
                {" "}
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontWeight: "400",
                    fontSize: "11px",
                    lineHeight: "16px",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    color: "rgba(var(--cy-muted-rgb),0.55)",
                  }}
                >
                  {"Agent ready"}
                </span>{" "}
                <span
                  style={{
                    fontFamily: "Poppins, Inter, sans-serif",
                    fontWeight: "500",
                    fontSize: "1.375rem",
                    lineHeight: "28px",
                    letterSpacing: "-0.4px",
                    color: "var(--cy-fg)",
                    textWrap: "pretty",
                  }}
                >
                  {"Built for TypeScript"}
                </span>{" "}
                <span
                  style={{
                    marginTop: "var(--cy-space-4)",
                    fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                    fontWeight: "400",
                    fontSize: "0.875rem",
                    lineHeight: "21px",
                    color: "var(--cy-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {
                    "Typed APIs and exports help developers catch mistakes earlier and work faster in their editor."
                  }
                </span>{" "}
              </div>{" "}
              <div
                style={{
                  flex: "1 1 0px",
                  minWidth: "0px",
                  minHeight: "280px",
                  padding: "var(--cy-space-28)",
                  boxSizing: "border-box",
                  borderRadius: "12px",
                  background:
                    "radial-gradient(66% 66% at 83% 104%, rgba(217, 196, 233, 0.2) 0%, rgba(108, 155, 234, 0.2) 70%, rgba(24, 99, 220, 0.02) 100%), rgb(248, 248, 249)",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {" "}
                <div
                  data-agent="1"
                  data-fit="316"
                  className="cy-ent"
                  style={{
                    position: "relative",
                    width: "316px",
                    height: "250px",
                    flexShrink: "0",
                    transform: "scale(0.639)",
                    transformOrigin: "center center",
                  }}
                >
                  {" "}
                  <svg
                    aria-hidden="true"
                    width="60"
                    height="48"
                    viewBox="0 0 60 48"
                    fill="none"
                    style={{
                      position: "absolute",
                      left: "76px",
                      top: "158px",
                      pointerEvents: "none",
                    }}
                  >
                    <path
                      d="M8 4 C 10 24, 24 34, 48 36"
                      stroke="rgba(19,111,232,0.75)"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <circle cx="50" cy="36" r="2" fill="rgba(19,111,232,0.75)" />
                  </svg>{" "}
                  <div
                    data-ac-panel=""
                    style={{
                      position: "absolute",
                      left: "0px",
                      top: "8px",
                      width: "168px",
                      borderRadius: "10px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.14) 0px 12px 28px",
                      overflow: "hidden",
                      fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                      fontSize: "10px",
                      lineHeight: "14px",
                      transition: "opacity 0.25s, transform 0.25s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    {" "}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: "var(--cy-space-8)",
                        padding: "var(--cy-space-8) var(--cy-space-12)",
                        background: "var(--cy-accent)",
                      }}
                    >
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <rect
                          x="4"
                          y="3"
                          width="16"
                          height="18"
                          rx="2"
                          stroke="#FFFFFF"
                          strokeWidth="2.4"
                        />
                        <path
                          d="M8 8h8M8 12h8M8 16h5"
                          stroke="#FFFFFF"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        style={{
                          fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                          fontWeight: "600",
                          fontSize: "11px",
                          lineHeight: "14px",
                          color: "rgb(255, 255, 255)",
                        }}
                      >
                        {"llms.txt"}
                      </span>
                    </div>{" "}
                    <div
                      data-ac-row="0"
                      style={{
                        padding: "var(--cy-space-8) var(--cy-space-12)",
                        color: "rgb(58, 65, 96)",
                        background: "var(--cy-row-hl)",
                        transition: "background 0.35s",
                      }}
                    >
                      {"analytics"}
                    </div>{" "}
                    <div
                      data-ac-row="1"
                      style={{
                        padding: "var(--cy-space-8) var(--cy-space-12)",
                        color: "rgb(58, 65, 96)",
                        background: "transparent",
                        transition: "background 0.35s",
                      }}
                    >
                      {"marketing"}
                    </div>{" "}
                    <div
                      data-ac-row="2"
                      style={{
                        padding: "var(--cy-space-8) var(--cy-space-12)",
                        color: "rgb(58, 65, 96)",
                        background: "transparent",
                        transition: "background 0.35s",
                      }}
                    >
                      {"functional"}
                    </div>{" "}
                    <div
                      style={{
                        padding: "var(--cy-space-8) var(--cy-space-12)",
                        color: "rgba(58, 65, 96, 0.4)",
                      }}
                    >
                      {"necessary"}
                    </div>{" "}
                  </div>{" "}
                  <div
                    style={{
                      position: "absolute",
                      right: "0px",
                      bottom: "8px",
                      width: "184px",
                      borderRadius: "12px",
                      background: "rgb(23, 26, 33)",
                      boxShadow: "rgba(20, 20, 42, 0.22) 0px 16px 34px",
                      padding: "var(--cy-space-12) var(--cy-space-16)",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--cy-space-8)",
                      zIndex: "1",
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
                        gap: "2px",
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "10.5px",
                        lineHeight: "16px",
                      }}
                    >
                      {" "}
                      <span style={{ color: "rgb(138, 145, 166)" }}>{"agent reads"}</span>{" "}
                      <span style={{ color: "rgb(255, 255, 255)", fontWeight: "600" }}>
                        {"consent."}
                        <span data-ac-line="">{"marketing"}</span>
                      </span>{" "}
                      <span style={{ color: "rgb(121, 184, 255)" }}>{"→ true"}</span>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <div
            data-bento="4"
            style={{
              background: "var(--cy-surface)",
              border: "1px solid rgb(227, 229, 241)",
              borderRadius: "16px",
              padding: "var(--cy-space-24)",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: "var(--cy-space-24)",
              minHeight: "320px",
              overflow: "hidden",
            }}
          >
            {" "}
            <div
              style={{
                flex: "0 0 190px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: "var(--cy-space-8)",
                padding: "var(--cy-space-8) 0 var(--cy-space-8) var(--cy-space-8)",
              }}
            >
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "11px",
                  lineHeight: "16px",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  color: "rgba(var(--cy-muted-rgb),0.55)",
                }}
              >
                {"Integrations"}
              </span>{" "}
              <span
                style={{
                  fontFamily: "Poppins, Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "1.375rem",
                  lineHeight: "28px",
                  letterSpacing: "-0.4px",
                  color: "var(--cy-fg)",
                  textWrap: "pretty",
                }}
              >
                {"Load third-party tools only after consent"}
              </span>{" "}
              <span
                style={{
                  marginTop: "var(--cy-space-4)",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "0.875rem",
                  lineHeight: "21px",
                  color: "var(--cy-muted)",
                  textWrap: "pretty",
                }}
              >
                {"Control when GA4, GTM, Meta Pixel, Mixpanel and 40+ integrations can run."}
              </span>{" "}
            </div>{" "}
            <div
              style={{
                flex: "1 1 0%",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: "0px",
                minHeight: "280px",
                borderRadius: "12px",
                background:
                  "radial-gradient(66% 66% at 83% 104%, rgba(217, 196, 233, 0.2) 0%, rgba(108, 155, 234, 0.2) 70%, rgba(24, 99, 220, 0.02) 100%), rgb(248, 248, 249)",
                padding: "var(--cy-space-32) var(--cy-space-36)",
                boxSizing: "border-box",
                overflow: "hidden",
              }}
            >
              {" "}
              <div
                data-gate="1"
                className="cy-ent"
                style={{
                  position: "relative",
                  width: "100%",
                  maxWidth: "960px",
                  height: "200px",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "0px",
                }}
              >
                {" "}
                <div
                  style={{ flexShrink: "0", width: "132px", display: "flex", alignItems: "center" }}
                >
                  {" "}
                  <div
                    style={{
                      width: "100%",
                      borderRadius: "10px",
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
                    <span
                      style={{
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "9px",
                        lineHeight: "12px",
                        letterSpacing: "1px",
                        textTransform: "uppercase",
                        color: "rgb(138, 145, 166)",
                      }}
                    >
                      {"consent"}
                    </span>{" "}
                    <div
                      data-gate-mtg=""
                      style={{
                        position: "relative",
                        width: "36px",
                        height: "19px",
                        borderRadius: "999px",
                        border: "1px solid rgba(var(--cy-accent-rgb),0.6)",
                        boxSizing: "border-box",
                        background:
                          "linear-gradient(165deg, var(--cy-accent), var(--cy-accent-deep) 160%)",
                        transition: "background 0.3s, border-color 0.2s",
                      }}
                    >
                      <span
                        data-gate-mth=""
                        style={{
                          position: "absolute",
                          left: "2px",
                          top: "2px",
                          width: "13px",
                          height: "13px",
                          borderRadius: "50%",
                          background: "rgb(255, 255, 255)",
                          boxShadow: "rgba(20, 20, 42, 0.3) 0px 1px 2px",
                          transform: "translateX(15px)",
                          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                    </div>{" "}
                    <span
                      data-gate-status=""
                      style={{
                        fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                        fontSize: "7.5px",
                        lineHeight: "10px",
                        color: "rgb(154, 163, 184)",
                        transition: "opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)",
                      }}
                    >
                      {"marketing: granted"}
                    </span>{" "}
                  </div>{" "}
                </div>{" "}
                <svg
                  data-gate-svg=""
                  aria-hidden="true"
                  viewBox="0 0 410.0 200.0"
                  preserveAspectRatio="none"
                  style={{
                    flex: "1 1 0%",
                    minWidth: "0px",
                    height: "200px",
                    display: "block",
                    overflow: "visible",
                  }}
                >
                  {" "}
                  <line
                    data-gate-bar=""
                    x1="57.400000000000006"
                    y1="14"
                    x2="57.400000000000006"
                    y2="186"
                    style={{
                      stroke: "rgb(199, 206, 224)",
                      strokeWidth: "1",
                      strokeDasharray: "3, 4",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />{" "}
                  <path
                    data-gate-b="0"
                    d="M 0 100.0 C 131.2 100.0 205.0 18.0 410.0 18.0"
                    style={{
                      fill: "none",
                      stroke: "rgb(213, 219, 234)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-b="1"
                    d="M 0 100.0 C 131.2 100.0 205.0 50.8 410.0 50.8"
                    style={{
                      fill: "none",
                      stroke: "rgb(213, 219, 234)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-b="2"
                    d="M 0 100.0 C 131.2 100.0 205.0 83.6 410.0 83.6"
                    style={{
                      fill: "none",
                      stroke: "rgb(213, 219, 234)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-b="3"
                    d="M 0 100.0 C 131.2 100.0 205.0 116.4 410.0 116.4"
                    style={{
                      fill: "none",
                      stroke: "rgb(213, 219, 234)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-b="4"
                    d="M 0 100.0 C 131.2 100.0 205.0 149.2 410.0 149.2"
                    style={{
                      fill: "none",
                      stroke: "rgb(213, 219, 234)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-b="5"
                    d="M 0 100.0 C 131.2 100.0 205.0 182.0 410.0 182.0"
                    style={{
                      fill: "none",
                      stroke: "rgb(213, 219, 234)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />{" "}
                  <path
                    data-gate-o="0"
                    d="M 0 100.0 C 131.2 100.0 205.0 18.0 410.0 18.0"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.2",
                      opacity: "0.85",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-o="1"
                    d="M 0 100.0 C 131.2 100.0 205.0 50.8 410.0 50.8"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.2",
                      opacity: "0.85",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-o="2"
                    d="M 0 100.0 C 131.2 100.0 205.0 83.6 410.0 83.6"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.2",
                      opacity: "0.85",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-o="3"
                    d="M 0 100.0 C 131.2 100.0 205.0 116.4 410.0 116.4"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.2",
                      opacity: "0.85",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-o="4"
                    d="M 0 100.0 C 131.2 100.0 205.0 149.2 410.0 149.2"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.2",
                      opacity: "0.85",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                  <path
                    data-gate-o="5"
                    d="M 0 100.0 C 131.2 100.0 205.0 182.0 410.0 182.0"
                    style={{
                      fill: "none",
                      stroke: "var(--cy-accent)",
                      strokeWidth: "1.2",
                      opacity: "0.85",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />{" "}
                  <rect
                    data-gate-latch=""
                    x="50.400000000000006"
                    y="83"
                    width="14"
                    height="34"
                    rx="3"
                    style={{
                      fill: "rgb(255, 255, 255)",
                      stroke: "rgb(199, 206, 224)",
                      strokeWidth: "1",
                      vectorEffect: "non-scaling-stroke",
                      transform: "translateY(-34px)",
                      transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  />{" "}
                </svg>{" "}
                <div
                  data-rsp="gate-side"
                  style={{
                    flexShrink: "0",
                    width: "178px",
                    height: "192px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div
                    data-gate-chip="0"
                    style={{
                      height: "28px",
                      borderRadius: "8px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.06) 0px 2px 8px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                      padding: "0 var(--cy-space-12)",
                      boxSizing: "border-box",
                      transition:
                        "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "12px",
                        height: "12px",
                        flexShrink: "0",
                        display: "block",
                        backgroundColor: "rgb(36, 111, 219)",
                        mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googletagmanager.svg") center center / contain no-repeat',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "var(--cy-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"Google Tag Manager"}
                    </span>
                  </div>
                  <div
                    data-gate-chip="1"
                    style={{
                      height: "28px",
                      borderRadius: "8px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.06) 0px 2px 8px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                      padding: "0 var(--cy-space-12)",
                      boxSizing: "border-box",
                      transition:
                        "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "12px",
                        height: "12px",
                        flexShrink: "0",
                        display: "block",
                        backgroundColor: "rgb(227, 116, 0)",
                        mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googleanalytics.svg") center center / contain no-repeat',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "var(--cy-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"Google Analytics"}
                    </span>
                  </div>
                  <div
                    data-gate-chip="2"
                    style={{
                      height: "28px",
                      borderRadius: "8px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.06) 0px 2px 8px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                      padding: "0 var(--cy-space-12)",
                      boxSizing: "border-box",
                      transition:
                        "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "12px",
                        height: "12px",
                        flexShrink: "0",
                        display: "block",
                        backgroundColor: "rgb(4, 103, 223)",
                        mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/meta.svg") center center / contain no-repeat',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "var(--cy-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"Meta Pixel"}
                    </span>
                  </div>
                  <div
                    data-gate-chip="3"
                    style={{
                      height: "28px",
                      borderRadius: "8px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.06) 0px 2px 8px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                      padding: "0 var(--cy-space-12)",
                      boxSizing: "border-box",
                      transition:
                        "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "12px",
                        height: "12px",
                        flexShrink: "0",
                        display: "block",
                        background:
                          'url("figma-logos/microsoft-clarity.svg") center center / contain no-repeat',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "var(--cy-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"Microsoft Clarity"}
                    </span>
                  </div>
                  <div
                    data-gate-chip="4"
                    style={{
                      height: "28px",
                      borderRadius: "8px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.06) 0px 2px 8px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                      padding: "0 var(--cy-space-12)",
                      boxSizing: "border-box",
                      transition:
                        "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: "12px",
                        height: "12px",
                        flexShrink: "0",
                        display: "block",
                        backgroundColor: "rgb(82, 189, 148)",
                        mask: 'url("figma-logos/segment.svg") center center / contain no-repeat',
                      }}
                    />
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "var(--cy-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"Segment"}
                    </span>
                  </div>
                  <div
                    data-gate-chip="5"
                    style={{
                      height: "28px",
                      borderRadius: "8px",
                      border: "1px solid rgb(231, 234, 244)",
                      background: "rgb(255, 255, 255)",
                      boxShadow: "rgba(20, 20, 42, 0.06) 0px 2px 8px",
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: "var(--cy-space-8)",
                      padding: "0 var(--cy-space-12)",
                      boxSizing: "border-box",
                      transition:
                        "opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1), transform 0.55s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.55s",
                    }}
                  >
                    <svg
                      aria-hidden="true"
                      width="12"
                      height="12"
                      viewBox="0 0 48 48"
                      style={{ flexShrink: "0" }}
                    >
                      <g transform="skewX(-16)">
                        <rect x="19" y="21" width="7" height="17" rx="2" fill="#1D4AFF" />
                        <rect x="29" y="14" width="7" height="24" rx="2" fill="#F54E00" />
                        <rect x="39" y="7" width="7" height="31" rx="2" fill="#F9BD2B" />
                      </g>
                      <path d="M 31 38 L 45 38 L 45 30.5 Z" fill="#14142A" />
                    </svg>
                    <span
                      style={{
                        fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                        fontSize: "11px",
                        lineHeight: "14px",
                        color: "var(--cy-muted)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {"PostHog"}
                    </span>
                  </div>
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
