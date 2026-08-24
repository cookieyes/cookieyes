// Ported from design/cydev/CookieYes Landing.dc.html — section "Footer".
// Markup mirrors the design file; change the design and re-port rather than diverging here.
export function SiteFooter() {
  return (
    <footer
      className="cy-band-light"
      data-screen-label="Footer"
      style={{
        position: "relative",
        zIndex: "1",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "rgb(21, 23, 26)",
      }}
    >
      {" "}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "1152px",
          padding: "var(--cy-space-48) var(--cy-space-24) var(--cy-space-4)",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
        }}
      >
        {" "}
        <div
          data-rsp="footer-top"
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            gap: "var(--cy-space-48)",
            alignItems: "flex-start",
          }}
        >
          {" "}
          <div
            style={{
              maxWidth: "320px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
          >
            {" "}
            <span aria-label="CookieYes" style={{ display: "block" }}>
              <svg
                width="136"
                height="22"
                viewBox="0 0 154 25"
                fill="none"
                style={{ display: "block" }}
              >
                <path
                  d="M10.8035 2.84277C15.9232 2.84277 19.7486 5.69813 20.9851 10.3752H15.2507C14.3685 8.5029 12.7198 7.62099 10.7529 7.62099C7.54944 7.62099 5.32221 10.0137 5.32221 13.8594C5.32221 17.7051 7.54221 20.0979 10.7529 20.0979C12.7198 20.0979 14.3685 19.1654 15.2507 17.3437H20.9851C19.7414 22.0207 15.916 24.8761 10.8035 24.8761C4.44723 24.8255 0 20.3003 0 13.8088C0 7.31738 4.44723 2.84277 10.8035 2.84277Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M31.4199 24.9594C26.4086 24.9594 22.6339 21.5835 22.6339 16.1258C22.6339 10.6681 26.5099 7.29224 31.5211 7.29224C36.5324 7.29224 40.4084 10.6681 40.4084 16.1258C40.4084 21.5835 36.4312 24.9594 31.4127 24.9594H31.4199ZM31.4199 20.3835C33.2783 20.3835 35.0355 18.9812 35.0355 16.1258C35.0355 13.2704 33.329 11.868 31.4705 11.868C29.6121 11.868 27.9055 13.2198 27.9055 16.1258C27.9561 18.9812 29.5108 20.3835 31.4199 20.3835Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M50.8132 24.9594C45.8019 24.9594 42.0272 21.5835 42.0272 16.1258C42.0272 10.6681 45.9032 7.29224 50.9144 7.29224C55.9257 7.29224 59.8017 10.6681 59.8017 16.1258C59.8017 21.5835 55.8245 24.9594 50.806 24.9594H50.8132ZM50.8132 20.3835C52.6716 20.3835 54.4288 18.9812 54.4288 16.1258C54.4288 13.2704 52.7223 11.868 50.8638 11.868C49.0054 11.868 47.2988 13.2198 47.2988 16.1258C47.2988 19.0318 48.9041 20.3835 50.8132 20.3835Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M61.6533 2.84277H66.8743V14.4811L72.0447 7.51977H78.5094L71.43 16.0931L78.6179 24.6664H72.1531L66.9321 17.4449V24.6664H61.7112V2.84277H61.6606H61.6533Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M79.7544 2.9213C79.7544 1.30928 80.9982 0.065918 82.8566 0.065918C84.715 0.065918 85.9588 1.31651 85.9588 2.9213C85.9588 4.52608 84.7223 5.72607 82.8566 5.72607C80.9909 5.72607 79.7544 4.47548 79.7544 2.9213ZM80.275 7.48989H85.496V24.6366H80.275V7.48989Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M96.0184 24.9594C91.0071 24.9594 87.3843 21.5835 87.3843 16.1258C87.3843 10.6681 90.9493 7.29224 96.0184 7.29224C101.088 7.29224 104.544 10.6175 104.544 15.8656C104.544 16.3354 104.493 16.9065 104.443 17.427H92.6053C92.815 19.6607 94.16 20.7016 95.8593 20.7016C97.3056 20.7016 98.1299 19.9715 98.6 19.039H104.183C103.3 22.3642 100.307 24.9666 96.0184 24.9666V24.9594ZM92.6559 14.456H99.2219C99.2219 12.5837 97.7756 11.4922 96.0184 11.4922C94.2612 11.4922 92.9668 12.5331 92.6559 14.456Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M128.72 24.9594C123.708 24.9594 120.085 21.5835 120.085 16.1258C120.085 10.6681 123.65 7.29224 128.72 7.29224C133.789 7.29224 137.245 10.6175 137.245 15.8656C137.245 16.3354 137.195 16.9065 137.144 17.427H125.306C125.516 19.6607 126.854 20.7016 128.56 20.7016C130.007 20.7016 130.831 19.9715 131.301 19.039H136.884C136.009 22.3642 132.957 24.9666 128.72 24.9666V24.9594ZM125.314 14.456H131.88C131.88 12.5837 130.433 11.4922 128.676 11.4922C126.919 11.4922 125.625 12.5331 125.314 14.456Z"
                  fill="#F1F3F5"
                />
                <path
                  d="M146.73 24.9594C142.182 24.9594 139.13 22.4148 138.877 19.0896H144.048C144.149 20.2823 145.233 21.0631 146.687 21.0631C148.032 21.0631 148.755 20.4414 148.755 19.6607C148.755 16.9065 139.448 18.88 139.448 12.5909C139.448 9.67772 141.929 7.29224 146.376 7.29224C150.823 7.29224 153.253 9.73556 153.564 13.1114H148.704C148.553 11.9692 147.67 11.1885 146.174 11.1885C144.93 11.1885 144.264 11.6584 144.264 12.4897C144.264 15.2439 153.513 13.2704 153.622 19.7113C153.672 22.6751 151.04 24.9594 146.745 24.9594H146.73Z"
                  fill="#F1F3F5"
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
              </svg>
            </span>{" "}
            <span
              style={{
                padding: "var(--cy-space-8) 0",
                fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                fontWeight: "400",
                fontSize: "12px",
                lineHeight: "19.5px",
                color: "rgb(180, 184, 189)",
                whiteSpace: "pre-line",
              }}
            >
              {"Open-source, frontend-native cookie consent.\nMIT licensed."}
            </span>{" "}
          </div>{" "}
          <div
            data-rsp="footer-cols"
            style={{
              display: "flex",
              flexDirection: "row",
              gap: "var(--cy-space-56, 56px)",
              alignItems: "flex-start",
            }}
          >
            {" "}
            <div
              style={{
                minWidth: "120px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "10px",
                  lineHeight: "14.3px",
                  letterSpacing: "1px",
                  color: "rgb(130, 134, 139)",
                  textTransform: "uppercase",
                }}
              >
                {"Product"}
              </span>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0 var(--cy-space-12)",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Documentation"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Next.js"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"React"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Integrations"}
              </a>{" "}
            </div>{" "}
            <div
              style={{
                minWidth: "120px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "10px",
                  lineHeight: "14.3px",
                  letterSpacing: "1px",
                  color: "rgb(130, 134, 139)",
                  textTransform: "uppercase",
                }}
              >
                {"Project"}
              </span>{" "}
              <a
                href="https://www.npmjs.com/org/cookieyes"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0 var(--cy-space-12)",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"GitHub"}
              </a>{" "}
              <a
                href="https://www.npmjs.com/org/cookieyes"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"npm"}
              </a>{" "}
              <a
                href="https://github.com/cookieyes/cookieyes/releases"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Changelog"}
              </a>{" "}
            </div>{" "}
            <div
              style={{
                minWidth: "120px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "10px",
                  lineHeight: "14.3px",
                  letterSpacing: "1px",
                  color: "rgb(130, 134, 139)",
                  textTransform: "uppercase",
                }}
              >
                {"Company"}
              </span>{" "}
              <a
                href="https://www.cookieyes.com"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0 var(--cy-space-12)",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"CookieYes"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"GitHub"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Contact"}
              </a>{" "}
            </div>{" "}
            <div
              style={{
                minWidth: "120px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              {" "}
              <span
                style={{
                  fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
                  fontWeight: "400",
                  fontSize: "10px",
                  lineHeight: "14.3px",
                  letterSpacing: "1px",
                  color: "rgb(130, 134, 139)",
                  textTransform: "uppercase",
                }}
              >
                {"Legal"}
              </span>{" "}
              <a
                href="https://github.com/cookieyes/cookieyes/blob/main/LICENSE"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0 var(--cy-space-12)",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"MIT License"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Privacy Policy"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Cookie Policy"}
              </a>{" "}
              <a
                href="#"
                className="scpf"
                style={{
                  padding: "var(--cy-space-12) 0",
                  fontFamily: 'Inter, -apple-system, "Segoe UI", sans-serif',
                  fontWeight: "400",
                  fontSize: "14px",
                  lineHeight: "20px",
                  color: "rgb(130, 134, 139)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {"Terms and Conditions"}
              </a>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <canvas
          aria-hidden="true"
          style={{
            width: "100%",
            height: "200px",
            display: "block",
            marginTop: "var(--cy-space-section)",
            pointerEvents: "none",
          }}
        />{" "}
      </div>{" "}
    </footer>
  );
}
