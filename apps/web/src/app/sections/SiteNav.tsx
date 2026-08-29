// Ported from design/cydev/CookieYes Landing.dc.html — section "Navigation".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function SiteNav() {
  return (
    <nav
      className="cy-band-light"
      data-screen-label="Navigation"
      style={{
        position: "sticky",
        top: "0px",
        zIndex: "20",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {" "}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "0px",
          left: "0px",
          right: "0px",
          height: "76px",
          zIndex: "-1",
          pointerEvents: "none",
          opacity: "1",
          transition: "opacity 0.5s",
          backdropFilter: "blur(10px)",
          background: "transparent",
          maskImage: "linear-gradient(black 55%, transparent 100%)",
        }}
      />{" "}
      <div
        style={{
          width: "100%",
          maxWidth: "none",
          height: "56px",
          margin: "0px",
          background: "var(--cy-bg)",
          borderTopWidth: "medium",
          borderRightWidth: "medium",
          borderLeftWidth: "medium",
          borderTopStyle: "none",
          borderRightStyle: "none",
          borderLeftStyle: "none",
          borderColor: "var(--cy-border)",
          borderImage: "none",
          boxSizing: "border-box",
          boxShadow: "none",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          transition:
            "max-width 0.85s cubic-bezier(0.33, 1, 0.68, 1), height 0.85s cubic-bezier(0.33, 1, 0.68, 1), margin 0.85s cubic-bezier(0.33, 1, 0.68, 1), background 0.6s, border-color 0.6s, box-shadow 0.85s, backdrop-filter 0.6s, -webkit-backdrop-filter 0.6s",
          backdropFilter: "none",
        }}
      >
        {" "}
        <div
          style={{
            width: "100%",
            maxWidth: "1152px",
            height: "100%",
            padding: "0 var(--cy-space-gutter)",
            boxSizing: "border-box",
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
          }}
        >
          {" "}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "var(--cy-space-12)",
              alignItems: "flex-end",
              justifySelf: "start",
            }}
          >
            {" "}
            <a
              href="/"
              aria-label="CookieYes home"
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: "10px",
                width: "136px",
                height: "24px",
                transform: "translateY(-2px)",
                transition: "width 0.6s cubic-bezier(0.22, 1, 0.36, 1)",
                textDecoration: "none",
              }}
            >
              {" "}
              <svg
                width="136"
                height="22"
                viewBox="0 0 154 25"
                fill="none"
                style={{
                  display: "block",
                  flexShrink: "0",
                  opacity: "1",
                  transition: "opacity 0.35s",
                }}
              >
                <path
                  d="M10.8035 2.84277C15.9232 2.84277 19.7486 5.69813 20.9851 10.3752H15.2507C14.3685 8.5029 12.7198 7.62099 10.7529 7.62099C7.54944 7.62099 5.32221 10.0137 5.32221 13.8594C5.32221 17.7051 7.54221 20.0979 10.7529 20.0979C12.7198 20.0979 14.3685 19.1654 15.2507 17.3437H20.9851C19.7414 22.0207 15.916 24.8761 10.8035 24.8761C4.44723 24.8255 0 20.3003 0 13.8088C0 7.31738 4.44723 2.84277 10.8035 2.84277Z"
                  fill="#404041"
                />
                <path
                  d="M31.4199 24.9594C26.4086 24.9594 22.6339 21.5835 22.6339 16.1258C22.6339 10.6681 26.5099 7.29224 31.5211 7.29224C36.5324 7.29224 40.4084 10.6681 40.4084 16.1258C40.4084 21.5835 36.4312 24.9594 31.4127 24.9594H31.4199ZM31.4199 20.3835C33.2783 20.3835 35.0355 18.9812 35.0355 16.1258C35.0355 13.2704 33.329 11.868 31.4705 11.868C29.6121 11.868 27.9055 13.2198 27.9055 16.1258C27.9561 18.9812 29.5108 20.3835 31.4199 20.3835Z"
                  fill="#404041"
                />
                <path
                  d="M50.8132 24.9594C45.8019 24.9594 42.0272 21.5835 42.0272 16.1258C42.0272 10.6681 45.9032 7.29224 50.9144 7.29224C55.9257 7.29224 59.8017 10.6681 59.8017 16.1258C59.8017 21.5835 55.8245 24.9594 50.806 24.9594H50.8132ZM50.8132 20.3835C52.6716 20.3835 54.4288 18.9812 54.4288 16.1258C54.4288 13.2704 52.7223 11.868 50.8638 11.868C49.0054 11.868 47.2988 13.2198 47.2988 16.1258C47.2988 19.0318 48.9041 20.3835 50.8132 20.3835Z"
                  fill="#404041"
                />
                <path
                  d="M61.6533 2.84277H66.8743V14.4811L72.0447 7.51977H78.5094L71.43 16.0931L78.6179 24.6664H72.1531L66.9321 17.4449V24.6664H61.7112V2.84277H61.6606H61.6533Z"
                  fill="#404041"
                />
                <path
                  d="M79.7544 2.9213C79.7544 1.30928 80.9982 0.065918 82.8566 0.065918C84.715 0.065918 85.9588 1.31651 85.9588 2.9213C85.9588 4.52608 84.7223 5.72607 82.8566 5.72607C80.9909 5.72607 79.7544 4.47548 79.7544 2.9213ZM80.275 7.48989H85.496V24.6366H80.275V7.48989Z"
                  fill="#404041"
                />
                <path
                  d="M96.0184 24.9594C91.0071 24.9594 87.3843 21.5835 87.3843 16.1258C87.3843 10.6681 90.9493 7.29224 96.0184 7.29224C101.088 7.29224 104.544 10.6175 104.544 15.8656C104.544 16.3354 104.493 16.9065 104.443 17.427H92.6053C92.815 19.6607 94.16 20.7016 95.8593 20.7016C97.3056 20.7016 98.1299 19.9715 98.6 19.039H104.183C103.3 22.3642 100.307 24.9666 96.0184 24.9666V24.9594ZM92.6559 14.456H99.2219C99.2219 12.5837 97.7756 11.4922 96.0184 11.4922C94.2612 11.4922 92.9668 12.5331 92.6559 14.456Z"
                  fill="#404041"
                />
                <path
                  d="M128.72 24.9594C123.708 24.9594 120.085 21.5835 120.085 16.1258C120.085 10.6681 123.65 7.29224 128.72 7.29224C133.789 7.29224 137.245 10.6175 137.245 15.8656C137.245 16.3354 137.195 16.9065 137.144 17.427H125.306C125.516 19.6607 126.854 20.7016 128.56 20.7016C130.007 20.7016 130.831 19.9715 131.301 19.039H136.884C136.009 22.3642 132.957 24.9666 128.72 24.9666V24.9594ZM125.314 14.456H131.88C131.88 12.5837 130.433 11.4922 128.676 11.4922C126.919 11.4922 125.625 12.5331 125.314 14.456Z"
                  fill="#404041"
                />
                <path
                  d="M146.73 24.9594C142.182 24.9594 139.13 22.4148 138.877 19.0896H144.048C144.149 20.2823 145.233 21.0631 146.687 21.0631C148.032 21.0631 148.755 20.4414 148.755 19.6607C148.755 16.9065 139.448 18.88 139.448 12.5909C139.448 9.67772 141.929 7.29224 146.376 7.29224C150.823 7.29224 153.253 9.73556 153.564 13.1114H148.704C148.553 11.9692 147.67 11.1885 146.174 11.1885C144.93 11.1885 144.264 11.6584 144.264 12.4897C144.264 15.2439 153.513 13.2704 153.622 19.7113C153.672 22.6751 151.04 24.9594 146.745 24.9594H146.73Z"
                  fill="#404041"
                />
                <path
                  d="M110.023 7.79285H104.593L109.553 17.0457H114.984L110.023 7.79285Z"
                  fill="#0056A7"
                />
                <path
                  d="M109.459 16.7946L109.611 17.0548H115.042L111.477 10.5562L109.459 16.7946Z"
                  fill="#2E3191"
                />
                <path d="M119.33 0L109.56 17.0455H114.991L124.76 0H119.33Z" fill="#0056A7" />
                <path d="M109.56 19.5986H114.832V24.9479H109.56V19.5986Z" fill="#0056A7" />
              </svg>{" "}
              <svg
                width="111"
                height="18"
                viewBox="0 0 154 25"
                fill="none"
                style={{
                  position: "absolute",
                  left: "0px",
                  top: "3px",
                  opacity: "0",
                  transition: "opacity 0.35s",
                }}
              >
                <path
                  d="M10.8035 2.84277C15.9232 2.84277 19.7486 5.69813 20.9851 10.3752H15.2507C14.3685 8.5029 12.7198 7.62099 10.7529 7.62099C7.54944 7.62099 5.32221 10.0137 5.32221 13.8594C5.32221 17.7051 7.54221 20.0979 10.7529 20.0979C12.7198 20.0979 14.3685 19.1654 15.2507 17.3437H20.9851C19.7414 22.0207 15.916 24.8761 10.8035 24.8761C4.44723 24.8255 0 20.3003 0 13.8088C0 7.31738 4.44723 2.84277 10.8035 2.84277Z"
                  fill="#404041"
                />
                <path
                  d="M31.4199 24.9594C26.4086 24.9594 22.6339 21.5835 22.6339 16.1258C22.6339 10.6681 26.5099 7.29224 31.5211 7.29224C36.5324 7.29224 40.4084 10.6681 40.4084 16.1258C40.4084 21.5835 36.4312 24.9594 31.4127 24.9594H31.4199ZM31.4199 20.3835C33.2783 20.3835 35.0355 18.9812 35.0355 16.1258C35.0355 13.2704 33.329 11.868 31.4705 11.868C29.6121 11.868 27.9055 13.2198 27.9055 16.1258C27.9561 18.9812 29.5108 20.3835 31.4199 20.3835Z"
                  fill="#404041"
                />
                <path
                  d="M50.8132 24.9594C45.8019 24.9594 42.0272 21.5835 42.0272 16.1258C42.0272 10.6681 45.9032 7.29224 50.9144 7.29224C55.9257 7.29224 59.8017 10.6681 59.8017 16.1258C59.8017 21.5835 55.8245 24.9594 50.806 24.9594H50.8132ZM50.8132 20.3835C52.6716 20.3835 54.4288 18.9812 54.4288 16.1258C54.4288 13.2704 52.7223 11.868 50.8638 11.868C49.0054 11.868 47.2988 13.2198 47.2988 16.1258C47.2988 19.0318 48.9041 20.3835 50.8132 20.3835Z"
                  fill="#404041"
                />
                <path
                  d="M61.6533 2.84277H66.8743V14.4811L72.0447 7.51977H78.5094L71.43 16.0931L78.6179 24.6664H72.1531L66.9321 17.4449V24.6664H61.7112V2.84277H61.6606H61.6533Z"
                  fill="#404041"
                />
                <path
                  d="M79.7544 2.9213C79.7544 1.30928 80.9982 0.065918 82.8566 0.065918C84.715 0.065918 85.9588 1.31651 85.9588 2.9213C85.9588 4.52608 84.7223 5.72607 82.8566 5.72607C80.9909 5.72607 79.7544 4.47548 79.7544 2.9213ZM80.275 7.48989H85.496V24.6366H80.275V7.48989Z"
                  fill="#404041"
                />
                <path
                  d="M96.0184 24.9594C91.0071 24.9594 87.3843 21.5835 87.3843 16.1258C87.3843 10.6681 90.9493 7.29224 96.0184 7.29224C101.088 7.29224 104.544 10.6175 104.544 15.8656C104.544 16.3354 104.493 16.9065 104.443 17.427H92.6053C92.815 19.6607 94.16 20.7016 95.8593 20.7016C97.3056 20.7016 98.1299 19.9715 98.6 19.039H104.183C103.3 22.3642 100.307 24.9666 96.0184 24.9666V24.9594ZM92.6559 14.456H99.2219C99.2219 12.5837 97.7756 11.4922 96.0184 11.4922C94.2612 11.4922 92.9668 12.5331 92.6559 14.456Z"
                  fill="#404041"
                />
                <path
                  d="M128.72 24.9594C123.708 24.9594 120.085 21.5835 120.085 16.1258C120.085 10.6681 123.65 7.29224 128.72 7.29224C133.789 7.29224 137.245 10.6175 137.245 15.8656C137.245 16.3354 137.195 16.9065 137.144 17.427H125.306C125.516 19.6607 126.854 20.7016 128.56 20.7016C130.007 20.7016 130.831 19.9715 131.301 19.039H136.884C136.009 22.3642 132.957 24.9666 128.72 24.9666V24.9594ZM125.314 14.456H131.88C131.88 12.5837 130.433 11.4922 128.676 11.4922C126.919 11.4922 125.625 12.5331 125.314 14.456Z"
                  fill="#404041"
                />
                <path
                  d="M146.73 24.9594C142.182 24.9594 139.13 22.4148 138.877 19.0896H144.048C144.149 20.2823 145.233 21.0631 146.687 21.0631C148.032 21.0631 148.755 20.4414 148.755 19.6607C148.755 16.9065 139.448 18.88 139.448 12.5909C139.448 9.67772 141.929 7.29224 146.376 7.29224C150.823 7.29224 153.253 9.73556 153.564 13.1114H148.704C148.553 11.9692 147.67 11.1885 146.174 11.1885C144.93 11.1885 144.264 11.6584 144.264 12.4897C144.264 15.2439 153.513 13.2704 153.622 19.7113C153.672 22.6751 151.04 24.9594 146.745 24.9594H146.73Z"
                  fill="#404041"
                />
                <path
                  d="M110.023 7.79285H104.593L109.553 17.0457H114.984L110.023 7.79285Z"
                  fill="#0056A7"
                />
                <path
                  d="M109.459 16.7946L109.611 17.0548H115.042L111.477 10.5562L109.459 16.7946Z"
                  fill="#2E3191"
                />
                <path d="M119.33 0L109.56 17.0455H114.991L124.76 0H119.33Z" fill="#0056A7" />
                <path d="M109.56 19.5986H114.832V24.9479H109.56V19.5986Z" fill="#0056A7" />
              </svg>{" "}
            </a>{" "}
            <span
              data-logo-suffix="1"
              style={{
                fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                fontWeight: "400",
                fontSize: "16.5px",
                lineHeight: "20px",
                letterSpacing: "-0.1px",
                color: "var(--cy-muted)",
                whiteSpace: "nowrap",
                marginLeft: "-5px",
                transform: "translateY(-1px)",
              }}
            >
              {"for Developers"}
            </span>{" "}
          </div>{" "}
          <div
            data-nav-links="1"
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "var(--cy-space-32)",
              height: "34px",
              marginLeft: "var(--cy-space-24)",
              marginRight: "var(--cy-space-16)",
            }}
          >
            {" "}
            <a
              href="/docs"
              data-navlink="1"
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                fontWeight: "500",
                fontSize: "0.875rem",
                lineHeight: "16px",
                color: "var(--cy-fg)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {"Docs"}
            </a>{" "}
            <a
              href="https://github.com/cookieyes/cookieyes"
              data-navlink="1"
              style={{
                display: "flex",
                alignItems: "center",
                fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                fontWeight: "500",
                fontSize: "0.875rem",
                lineHeight: "16px",
                color: "var(--cy-fg)",
                textDecoration: "none",
                transition: "color 0.15s",
              }}
            >
              {"Blog"}
            </a>{" "}
          </div>{" "}
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "var(--cy-space-8)",
              alignItems: "center",
              justifySelf: "end",
              gridColumn: "3",
            }}
          >
            {" "}
            <a
              href="https://github.com/cookieyes/cookieyes"
              data-nav-gh="1"
              aria-label="GitHub repository"
              className="scp1"
              style={{
                display: "flex",
                flexDirection: "row",
                padding: "var(--cy-space-8) var(--cy-space-12)",
                alignItems: "center",
                textDecoration: "none",
                color: "var(--cy-muted)",
                transition: "color 0.15s",
              }}
            >
              {" "}
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>{" "}
            </a>{" "}
            <div
              data-nav-search="1"
              className="scp2"
              style={{
                height: "32px",
                minWidth: "118px",
                border: "1px solid var(--cy-faint)",
                background: "var(--cy-surface)",
                display: "flex",
                flexDirection: "row",
                gap: "var(--cy-space-8)",
                padding: "0 var(--cy-space-12)",
                alignItems: "center",
                boxSizing: "border-box",
                cursor: "pointer",
                transition: "border-color 0.15s",
              }}
            >
              {" "}
              <svg
                width="13"
                height="13"
                viewBox="0 0 16 16"
                fill="none"
                style={{ flexShrink: "0" }}
              >
                <circle
                  cx="7"
                  cy="7"
                  r="5"
                  stroke="rgba(var(--cy-muted-rgb),0.75)"
                  strokeWidth="1.5"
                />
                <line
                  x1="11"
                  y1="11"
                  x2="14.5"
                  y2="14.5"
                  stroke="rgba(var(--cy-muted-rgb),0.75)"
                  strokeWidth="1.5"
                />
              </svg>{" "}
              <span
                style={{
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "0.8125rem",
                  lineHeight: "18px",
                  color: "rgba(var(--cy-muted-rgb),0.75)",
                }}
              >
                {"Search"}
              </span>{" "}
              <span
                data-nav-kbd="1"
                style={{
                  marginLeft: "auto",
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "500",
                  fontSize: "0.8125rem",
                  lineHeight: "18px",
                  letterSpacing: "0.5px",
                  color: "rgba(var(--cy-muted-rgb),0.75)",
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: "2px",
                }}
              >
                <span style={{ fontSize: "1rem", lineHeight: "18px" }}>{"⌘"}</span>
                {"K"}
              </span>{" "}
            </div>{" "}
            <div
              data-burger="1"
              aria-label="Open menu"
              style={{
                display: "none",
                width: "34px",
                height: "32px",
                borderRadius: "4px",
                border: "1px solid var(--cy-faint)",
                boxSizing: "border-box",
                flexDirection: "column",
                gap: "4px",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
              }}
            >
              {" "}
              <span style={{ width: "14px", height: "1.5px", background: "var(--cy-fg)" }} />{" "}
              <span style={{ width: "14px", height: "1.5px", background: "var(--cy-fg)" }} />{" "}
              <span style={{ width: "14px", height: "1.5px", background: "var(--cy-fg)" }} />{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </nav>
  );
}
