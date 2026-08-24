// Ported from design/cydev/CookieYes Landing.dc.html — section "03 Works with your stack".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function WorksWithYourStack() {
  return (
    <section
      className="cy-band-light section--beveled"
      data-screen-label="03 Works with your stack"
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
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1152px",
          padding: "var(--cy-section-y) var(--cy-space-gutter)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
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
        <div
          style={{
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
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
            {"One consent layer for your stack"}
          </h2>{" "}
          <p
            style={{
              margin: "var(--cy-space-8) 0 0",
              maxWidth: "720px",
              fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
              fontWeight: "400",
              fontSize: "0.875rem",
              lineHeight: "20px",
              color: "var(--cy-muted)",
              textWrap: "pretty",
            }}
          >
            {
              "Use consent from your app to control when analytics, ads, and other third-party tools can load."
            }
          </p>{" "}
        </div>{" "}
        <div
          style={{
            width: "100%",
            margin: "var(--cy-space-48) 0 0",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          {" "}
          <div
            data-fit="1024"
            style={{
              position: "relative",
              width: "1024px",
              height: "420px",
              flexShrink: "0",
              transformOrigin: "center center",
            }}
          >
            {" "}
            <svg
              viewBox="0 0 1024 420"
              style={{ position: "absolute", inset: "0px", width: "100%", height: "100%" }}
            >
              {" "}
              <defs>
                {" "}
                <radialGradient id="ccDotGreen" cx="35%" cy="30%" r="85%">
                  <stop offset="0%" stopColor="#8BE9A1" />
                  <stop offset="100%" stopColor="#2E9E44" />
                </radialGradient>{" "}
                <radialGradient id="ccDotGrey" cx="35%" cy="30%" r="85%">
                  <stop offset="0%" stopColor="#F0F2F9" />
                  <stop offset="100%" stopColor="#AEB5CB" />
                </radialGradient>{" "}
              </defs>{" "}
              <path
                d="M 240 124 C 330 124, 350 160, 428 178"
                className="cc-flow"
                style={{
                  fill: "none",
                  stroke: "rgb(159, 168, 196)",
                  strokeWidth: "1.5",
                  strokeLinecap: "round",
                  strokeDasharray: "4, 6",
                  animation: "1.1s linear 0s infinite normal none running ccDash",
                }}
              />{" "}
              <path
                d="M 240 244 C 330 244, 350 215, 428 202"
                className="cc-flow"
                style={{
                  fill: "none",
                  stroke: "rgb(159, 168, 196)",
                  strokeWidth: "1.5",
                  strokeLinecap: "round",
                  strokeDasharray: "4, 6",
                  animation: "1.1s linear 0s infinite normal none running ccDash",
                }}
              />{" "}
              <path
                d="M 596 172 C 680 150, 690 58, 764 58"
                style={{
                  fill: "none",
                  stroke: "rgba(63, 185, 80, 0.8)",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  filter: "drop-shadow(rgba(63, 185, 80, 0.45) 0px 1px 2px)",
                }}
              />{" "}
              <path
                d="M 596 181 C 680 168, 690 124, 764 124"
                style={{
                  fill: "none",
                  stroke: "rgba(63, 185, 80, 0.8)",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  filter: "drop-shadow(rgba(63, 185, 80, 0.45) 0px 1px 2px)",
                }}
              />{" "}
              <path
                d="M 596 190 L 764 190"
                style={{
                  fill: "none",
                  stroke: "rgba(63, 185, 80, 0.8)",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  filter: "drop-shadow(rgba(63, 185, 80, 0.45) 0px 1px 2px)",
                }}
              />{" "}
              <path
                d="M 596 199 C 680 212, 690 256, 764 256"
                className="cc-flow"
                style={{
                  fill: "none",
                  stroke: "rgb(159, 168, 196)",
                  strokeWidth: "1.4",
                  strokeLinecap: "round",
                  strokeDasharray: "4, 6",
                  animation: "1.7s linear 0s infinite normal none running ccDash",
                }}
              />{" "}
              <path
                d="M 596 208 C 680 230, 690 322, 764 322"
                className="cc-flow"
                style={{
                  fill: "none",
                  stroke: "rgb(159, 168, 196)",
                  strokeWidth: "1.4",
                  strokeLinecap: "round",
                  strokeDasharray: "4, 6",
                  animation: "1.7s linear 0s infinite normal none running ccDash",
                }}
              />{" "}
              <circle
                cx="764"
                cy="58"
                r="3.5"
                style={{
                  fill: 'url("#ccDotGreen")',
                  filter: "drop-shadow(rgba(46, 158, 68, 0.5) 0px 1px 2px)",
                }}
              />
              <circle
                cx="764"
                cy="124"
                r="3.5"
                style={{
                  fill: 'url("#ccDotGreen")',
                  filter: "drop-shadow(rgba(46, 158, 68, 0.5) 0px 1px 2px)",
                }}
              />
              <circle
                cx="764"
                cy="190"
                r="3.5"
                style={{
                  fill: 'url("#ccDotGreen")',
                  filter: "drop-shadow(rgba(46, 158, 68, 0.5) 0px 1px 2px)",
                }}
              />{" "}
              <circle
                cx="764"
                cy="256"
                r="3.5"
                style={{
                  fill: 'url("#ccDotGrey")',
                  filter: "drop-shadow(rgba(20, 20, 42, 0.2) 0px 1px 2px)",
                }}
              />
              <circle
                cx="764"
                cy="322"
                r="3.5"
                style={{
                  fill: 'url("#ccDotGrey")',
                  filter: "drop-shadow(rgba(20, 20, 42, 0.2) 0px 1px 2px)",
                }}
              />{" "}
            </svg>{" "}
            <span
              style={{
                position: "absolute",
                left: "40px",
                top: "0px",
                fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "rgb(154, 158, 191)",
              }}
            >
              {"Your app"}
            </span>{" "}
            <span
              style={{
                position: "absolute",
                left: "768px",
                top: "0px",
                fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "rgb(154, 158, 191)",
              }}
            >
              {"Loads after consent"}
            </span>{" "}
            <div
              style={{
                position: "absolute",
                left: "40px",
                top: "96px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  border: "1px solid rgb(237, 241, 250)",
                  boxSizing: "border-box",
                  background: "linear-gradient(rgb(255, 255, 255) 0%, rgb(245, 248, 253) 100%)",
                  boxShadow:
                    "rgba(24, 99, 220, 0.14) 0px 6px 16px, rgba(24, 99, 220, 0.1) 0px 1px 2px, rgb(255, 255, 255) 0px 1px 0px inset, rgba(24, 99, 220, 0.06) 0px -6px 10px inset",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "30px",
                    height: "30px",
                    display: "block",
                    backgroundColor: "rgb(97, 218, 251)",
                    mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/react.svg") center center / contain no-repeat',
                  }}
                />
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "500",
                    fontSize: "15px",
                    color: "rgb(20, 20, 42)",
                  }}
                >
                  {"React"}
                </span>
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    color: "rgb(154, 158, 191)",
                  }}
                >
                  {"@cookieyes/react"}
                </span>
              </span>
            </div>{" "}
            <div
              style={{
                position: "absolute",
                left: "40px",
                top: "216px",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <span
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  border: "1px solid rgb(237, 241, 250)",
                  boxSizing: "border-box",
                  background: "linear-gradient(rgb(255, 255, 255) 0%, rgb(245, 248, 253) 100%)",
                  boxShadow:
                    "rgba(24, 99, 220, 0.14) 0px 6px 16px, rgba(24, 99, 220, 0.1) 0px 1px 2px, rgb(255, 255, 255) 0px 1px 0px inset, rgba(24, 99, 220, 0.06) 0px -6px 10px inset",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: "26px",
                    height: "26px",
                    display: "block",
                    backgroundColor: "rgb(20, 20, 42)",
                    mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/nextdotjs.svg") center center / contain no-repeat',
                  }}
                />
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: "500",
                    fontSize: "15px",
                    color: "rgb(20, 20, 42)",
                  }}
                >
                  {"Next.js"}
                </span>
                <span
                  style={{
                    fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                    fontSize: "12px",
                    color: "rgb(154, 158, 191)",
                  }}
                >
                  {"@cookieyes/next"}
                </span>
              </span>
            </div>{" "}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "382px",
                top: "60px",
                width: "260px",
                height: "260px",
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(206, 224, 255, 0.95) 0%, rgba(206, 224, 255, 0) 70%)",
                animation: "6s ease-in-out 0s infinite normal none running ccPulse",
              }}
            />{" "}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "412px",
                top: "90px",
                width: "200px",
                height: "200px",
                boxSizing: "border-box",
                borderRadius: "50%",
                border: "1.3px dashed rgb(199, 214, 242)",
                animation: "32s linear 0s infinite normal none running ccSpin",
              }}
            />{" "}
            <div
              style={{
                position: "absolute",
                left: "437px",
                top: "115px",
                width: "150px",
                height: "150px",
                borderRadius: "50%",
                border: "1px solid rgb(237, 241, 250)",
                boxSizing: "border-box",
                background: "linear-gradient(rgb(255, 255, 255) 0%, rgb(244, 247, 253) 100%)",
                boxShadow:
                  "rgba(24, 99, 220, 0.2) 0px 18px 48px, rgba(24, 99, 220, 0.1) 0px 2px 4px, rgb(255, 255, 255) 0px 2px 0px inset, rgba(24, 99, 220, 0.07) 0px -12px 20px inset",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {" "}
              <svg aria-hidden="true" width="52" height="64" viewBox="0 0 65.368 80.858">
                {" "}
                <path
                  transform="translate(0 25.268)"
                  d="M 17.554 0 L 0 0 L 16.05 29.985 L 33.604 29.985 L 17.554 0 Z"
                  fill="#0056A7"
                />{" "}
                <path
                  transform="translate(15.714 34.196)"
                  d="M 0 20.215 L 0.502 21.057 L 18.056 21.057 L 6.52 0 L 0 20.215 Z"
                  fill="#2E3191"
                />{" "}
                <path
                  transform="translate(16.216 0)"
                  d="M 31.598 0 L 0 55.254 L 17.554 55.254 L 49.152 0 L 31.598 0 Z"
                  fill="#0056A7"
                />{" "}
                <path
                  transform="translate(16.216 63.507)"
                  d="M 0 0 L 17.053 0 L 17.053 17.351 L 0 17.351 L 0 0 Z"
                  fill="#0056A7"
                />{" "}
              </svg>{" "}
            </div>{" "}
            <span
              style={{
                position: "absolute",
                left: "437px",
                top: "282px",
                width: "150px",
                textAlign: "center",
                fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                fontSize: "12px",
                letterSpacing: "1px",
                textTransform: "uppercase",
                color: "rgb(154, 158, 191)",
              }}
            >
              {"one consent gate"}
            </span>{" "}
            <span
              style={{
                position: "absolute",
                left: "437px",
                top: "302px",
                width: "150px",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  padding: "3px 10px",
                  borderRadius: "999px",
                  border: "1px solid rgba(63, 185, 80, 0.45)",
                  background: "rgba(63, 185, 80, 0.08)",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "12px",
                  color: "rgb(31, 143, 68)",
                  whiteSpace: "nowrap",
                  animation: "6s ease-in-out 0s infinite normal none running ccBlink",
                }}
              >
                {"consent.analytics = true"}
              </span>
            </span>{" "}
            <div
              style={{
                position: "absolute",
                left: "768px",
                top: "38px",
                width: "224px",
                height: "42px",
                borderRadius: "999px",
                border: "1px solid rgb(227, 229, 241)",
                background: "linear-gradient(rgb(255, 255, 255) 0%, rgb(247, 249, 254) 100%)",
                boxShadow:
                  "rgba(20, 20, 42, 0.06) 0px 3px 8px, rgb(255, 255, 255) 0px 1px 0px inset",
                boxSizing: "border-box",
                padding: "0px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "rgb(63, 185, 80)",
                  animation: "6s ease-out 0s infinite normal none running ccRing",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: "18px",
                  height: "18px",
                  display: "block",
                  backgroundColor: "rgb(227, 116, 0)",
                  mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googleanalytics.svg") center center / contain no-repeat',
                }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "rgb(20, 20, 42)",
                  whiteSpace: "nowrap",
                }}
              >
                {"Google Analytics"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "11px",
                  color: "rgb(63, 185, 80)",
                }}
              >
                {"fires"}
              </span>
            </div>{" "}
            <div
              style={{
                position: "absolute",
                left: "768px",
                top: "104px",
                width: "224px",
                height: "42px",
                borderRadius: "999px",
                border: "1px solid rgb(227, 229, 241)",
                background: "linear-gradient(rgb(255, 255, 255) 0%, rgb(247, 249, 254) 100%)",
                boxShadow:
                  "rgba(20, 20, 42, 0.06) 0px 3px 8px, rgb(255, 255, 255) 0px 1px 0px inset",
                boxSizing: "border-box",
                padding: "0px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "rgb(63, 185, 80)",
                  animation: "6s ease-out 0.5s infinite normal none running ccRing",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: "18px",
                  height: "18px",
                  display: "block",
                  backgroundColor: "rgb(36, 111, 219)",
                  mask: 'url("https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/googletagmanager.svg") center center / contain no-repeat',
                }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "rgb(20, 20, 42)",
                }}
              >
                {"Tag Manager"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "11px",
                  color: "rgb(63, 185, 80)",
                }}
              >
                {"fires"}
              </span>
            </div>{" "}
            <div
              style={{
                position: "absolute",
                left: "768px",
                top: "170px",
                width: "224px",
                height: "42px",
                borderRadius: "999px",
                border: "1px solid rgb(227, 229, 241)",
                background: "linear-gradient(rgb(255, 255, 255) 0%, rgb(247, 249, 254) 100%)",
                boxShadow:
                  "rgba(20, 20, 42, 0.06) 0px 3px 8px, rgb(255, 255, 255) 0px 1px 0px inset",
                boxSizing: "border-box",
                padding: "0px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "rgb(63, 185, 80)",
                  animation: "6s ease-out 1s infinite normal none running ccRing",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: "20px",
                  height: "20px",
                  display: "block",
                  background: 'url("figma-logos/meta-infinity.png") 50% 53% / 148% no-repeat',
                }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "rgb(20, 20, 42)",
                }}
              >
                {"Meta Pixel"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "11px",
                  color: "rgb(63, 185, 80)",
                }}
              >
                {"fires"}
              </span>
            </div>{" "}
            <div
              style={{
                position: "absolute",
                left: "768px",
                top: "236px",
                width: "224px",
                height: "42px",
                borderRadius: "999px",
                border: "1px dashed rgb(201, 205, 222)",
                background: "rgb(251, 253, 255)",
                boxSizing: "border-box",
                padding: "0px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: "0.75",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "rgb(201, 205, 222)",
                }}
              />
              <span
                aria-hidden="true"
                style={{
                  width: "16px",
                  height: "16px",
                  flexShrink: "0",
                  display: "block",
                  backgroundColor: "rgb(82, 189, 148)",
                  mask: 'url("figma-logos/microsoft-clarity.svg") center center / contain no-repeat',
                  filter: "grayscale(1)",
                }}
              />
              <span
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "rgb(78, 75, 102)",
                }}
              >
                {"Microsoft Clarity"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "11px",
                  color: "rgb(154, 158, 191)",
                }}
              >
                {"held"}
              </span>
            </div>{" "}
            <div
              style={{
                position: "absolute",
                left: "768px",
                top: "302px",
                width: "224px",
                height: "42px",
                borderRadius: "999px",
                border: "1px dashed rgb(201, 205, 222)",
                background: "rgb(251, 253, 255)",
                boxSizing: "border-box",
                padding: "0px 14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                opacity: "0.75",
              }}
            >
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "rgb(201, 205, 222)",
                }}
              />
              <svg
                aria-hidden="true"
                width="18"
                height="18"
                viewBox="0 0 48 48"
                style={{ filter: "grayscale(1)" }}
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
                  fontFamily: "Inter, sans-serif",
                  fontWeight: "500",
                  fontSize: "14px",
                  color: "rgb(78, 75, 102)",
                }}
              >
                {"PostHog"}
              </span>
              <span
                style={{
                  marginLeft: "auto",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontSize: "11px",
                  color: "rgb(154, 158, 191)",
                }}
              >
                {"held"}
              </span>
            </div>{" "}
            <span
              style={{
                position: "absolute",
                left: "768px",
                top: "356px",
                fontFamily: "Inter, sans-serif",
                fontSize: "13px",
                lineHeight: "18px",
                color: "rgb(154, 158, 191)",
              }}
            >
              {'"held" = script never loads until this visitor says yes'}
            </span>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </section>
  );
}
