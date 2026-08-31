"use client";

import { useEffect, useState } from "react";

/** The design's own hooks on the burger button and the panel's close control. */
const BURGER_SELECTOR = "[data-burger]";
const CLOSE_SELECTOR = '[data-screen-label="Mobile menu"] [aria-label="Close menu"]';

/**
 * The full-screen navigation panel shown on small viewports.
 *
 * The design renders it conditionally, so the markup below was captured with the menu
 * open and the open/closed state lives here instead. Both triggers are matched by the
 * design's own data-attributes, which keeps the captured markup free of edits.
 *
 * Renders nothing while closed.
 */
export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const pageRoot = document.querySelector(".cy-page");
    if (!pageRoot) return;

    function handleClick(event: Event): void {
      const clickedElement = event.target as HTMLElement | null;
      if (!clickedElement) return;

      if (clickedElement.closest(BURGER_SELECTOR)) {
        setIsOpen((wasOpen) => !wasOpen);
        return;
      }
      if (clickedElement.closest(CLOSE_SELECTOR)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") setIsOpen(false);
    }

    pageRoot.addEventListener("click", handleClick);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      pageRoot.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // The panel covers the page, so the content behind it must not scroll.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="cy-band-light"
      data-screen-label="Mobile menu"
      style={{
        position: "fixed",
        inset: "0px",
        zIndex: "60",
        background: "var(--cy-bg)",
        display: "flex",
        flexDirection: "column",
        padding: "var(--cy-space-12) var(--cy-space-24) var(--cy-space-32)",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
    >
      {" "}
      <div
        style={{
          height: "56px",
          flexShrink: "0",
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
            fontWeight: "500",
            fontSize: "0.875rem",
            letterSpacing: "0.3px",
            color: "var(--cy-fg)",
          }}
        >
          <svg
            width="111"
            height="18"
            viewBox="0 0 313.208 50.909"
            fill="none"
            style={{ display: "block", color: "var(--cy-logo, var(--cy-accent))" }}
          >
            <path
              transform="translate(0 5.833)"
              d="M 22.033 0 C 32.47 0 40.271 5.833 42.801 15.379 L 31.099 15.379 C 29.307 11.561 25.934 9.758 21.928 9.758 C 15.391 9.758 10.858 14.636 10.858 22.485 C 10.858 30.333 15.391 35.212 21.928 35.212 C 25.934 35.212 29.307 33.303 31.099 29.591 L 42.801 29.591 C 40.271 39.136 32.47 44.97 22.033 44.97 C 9.066 44.863 0 35.636 0 22.379 C 0 9.121 9.066 0 22.033 0 Z"
              fill="currentColor"
            />
            <path
              transform="translate(46.174 14.849)"
              d="M 17.922 36.061 C 7.696 36.061 0 29.167 0 18.03 C 0 6.894 7.906 0 18.132 0 C 28.358 0 36.265 6.894 36.265 18.03 C 36.265 29.167 28.147 36.061 17.922 36.061 Z M 17.922 26.727 C 21.717 26.727 25.301 23.864 25.301 18.03 C 25.301 12.091 21.822 9.333 18.027 9.333 C 14.126 9.333 10.753 12.091 10.753 18.03 C 10.858 23.864 14.021 26.727 17.922 26.727 Z"
              fill="currentColor"
            />
            <path
              transform="translate(85.707 14.849)"
              d="M 17.922 36.061 C 7.696 36.061 0 29.167 0 18.03 C 0 6.894 7.907 0 18.132 0 C 28.358 0 36.265 6.894 36.265 18.03 C 36.265 29.167 28.148 36.061 17.922 36.061 Z M 17.922 26.727 C 21.717 26.727 25.301 23.864 25.301 18.03 C 25.301 12.091 21.822 9.333 18.027 9.333 C 14.126 9.333 10.753 12.091 10.753 18.03 C 10.753 23.864 14.021 26.727 17.922 26.727 Z"
              fill="currentColor"
            />
            <path
              transform="translate(125.767 5.833)"
              d="M 0 0 L 10.648 0 L 10.648 23.757 L 21.19 9.545 L 34.367 9.545 L 19.925 27.045 L 34.578 44.545 L 21.4 44.545 L 10.753 29.803 L 10.753 44.545 L 0.105 44.545 L 0.105 0 L 0 0 Z"
              fill="currentColor"
            />
            <path
              transform="translate(162.665 0.106)"
              d="M 0 5.833 C 0 2.545 2.53 0 6.326 0 C 10.121 0 12.65 2.545 12.65 5.833 C 12.65 9.015 10.121 11.561 6.326 11.561 C 2.53 11.561 0 9.015 0 5.833 Z M 1.054 15.167 L 11.702 15.167 L 11.702 50.167 L 1.054 50.167 L 1.054 15.167 Z"
              fill="currentColor"
            />
            <path
              transform="translate(178.267 14.849)"
              d="M 17.606 36.061 C 7.38 36.061 0 29.167 0 18.03 C 0 6.894 7.274 0 17.606 0 C 27.726 0 34.999 6.788 34.999 17.5 C 34.999 18.455 34.894 19.621 34.789 20.682 L 10.647 20.682 C 11.069 25.242 13.811 27.364 17.29 27.364 C 20.242 27.364 21.928 25.879 22.876 23.97 L 34.263 23.97 C 32.47 30.757 26.356 36.061 17.606 36.061 Z M 10.754 14.636 L 24.142 14.636 C 24.142 10.818 21.19 8.591 17.606 8.591 C 14.021 8.591 11.385 10.712 10.754 14.636 Z"
              fill="currentColor"
            />
            <path
              transform="translate(244.893 14.849)"
              d="M 17.605 36.061 C 7.379 36.061 0 29.167 0 18.03 C 0 6.894 7.274 0 17.605 0 C 27.726 0 34.999 6.788 34.999 17.5 C 34.999 18.455 34.894 19.621 34.789 20.682 L 10.647 20.682 C 11.069 25.242 13.809 27.364 17.29 27.364 C 20.24 27.364 21.928 25.879 22.876 23.97 L 34.261 23.97 C 32.47 30.757 26.249 36.061 17.605 36.061 Z M 10.647 14.636 L 24.035 14.636 C 24.035 10.818 21.085 8.591 17.5 8.591 C 14.021 8.591 11.28 10.712 10.647 14.636 Z"
              fill="currentColor"
            />
            <path
              transform="translate(283.161 14.849)"
              d="M 16.024 36.061 C 6.747 36.061 0.526 30.864 0 24.076 L 10.542 24.076 C 10.752 26.515 12.966 28.106 15.919 28.106 C 18.659 28.106 20.135 26.833 20.135 25.242 C 20.135 19.621 1.16 23.651 1.16 10.818 C 1.16 4.879 6.219 0 15.286 0 C 24.247 0 29.307 4.985 29.94 11.879 L 20.03 11.879 C 19.714 9.545 17.921 7.955 14.864 7.955 C 12.333 7.955 10.964 8.909 10.964 10.606 C 10.964 16.227 29.833 12.197 30.045 25.348 C 30.15 31.394 24.773 36.061 16.024 36.061 Z"
              fill="currentColor"
            />
            <path
              transform="translate(213.266 15.909)"
              d="M 11.071 0 L 0 0 L 10.121 18.879 L 21.19 18.879 L 11.071 0 Z"
              fill="currentColor"
            />
            <path
              transform="translate(223.177 21.53)"
              d="M 0 12.727 L 0.315 13.257 L 11.385 13.257 L 4.11 0 L 0 12.727 Z"
              fill="currentColor"
            />
            <path
              transform="translate(223.492 0)"
              d="M 19.925 0 L 0 34.788 L 11.071 34.788 L 30.994 0 L 19.925 0 Z"
              fill="currentColor"
            />
            <path
              transform="translate(223.492 39.985)"
              d="M 0 0 L 10.754 0 L 10.754 10.924 L 0 10.924 L 0 0 Z"
              fill="currentColor"
            />
          </svg>
        </span>{" "}
        <div
          aria-label="Close menu"
          style={{
            width: "34px",
            height: "32px",
            borderRadius: "4px",
            border: "1px solid var(--cy-faint)",
            boxSizing: "border-box",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
            fontSize: "0.8125rem",
            color: "var(--cy-fg)",
          }}
        >
          {"✕"}
        </div>{" "}
      </div>{" "}
      <div style={{ marginTop: "var(--cy-space-24)", display: "flex", flexDirection: "column" }}>
        {" "}
        <a
          href="/docs"
          style={{
            padding: "var(--cy-space-20) 0",
            borderTop: "1px solid var(--cy-border)",
            fontFamily: "Poppins, Inter, sans-serif",
            fontWeight: "500",
            fontSize: "1.375rem",
            lineHeight: "28px",
            letterSpacing: "-0.4px",
            color: "var(--cy-fg)",
            textDecoration: "none",
          }}
        >
          {"Documentation"}
        </a>{" "}
        <a
          href="https://github.com/cookieyes/cookieyes/releases"
          style={{
            padding: "var(--cy-space-20) 0",
            borderTop: "1px solid var(--cy-border)",
            fontFamily: "Poppins, Inter, sans-serif",
            fontWeight: "500",
            fontSize: "1.375rem",
            lineHeight: "28px",
            letterSpacing: "-0.4px",
            color: "var(--cy-fg)",
            textDecoration: "none",
          }}
        >
          {"Changelog"}
        </a>{" "}
        <a
          href="https://github.com/cookieyes/cookieyes"
          style={{
            padding: "var(--cy-space-20) 0",
            borderTop: "1px solid var(--cy-border)",
            display: "flex",
            flexDirection: "row",
            gap: "var(--cy-space-12)",
            alignItems: "baseline",
            fontFamily: "Poppins, Inter, sans-serif",
            fontWeight: "500",
            fontSize: "1.375rem",
            lineHeight: "28px",
            letterSpacing: "-0.4px",
            color: "var(--cy-fg)",
            textDecoration: "none",
          }}
        >
          {"GitHub"}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontWeight: "400",
              fontSize: "12px",
              color: "var(--cy-muted)",
            }}
          >
            {"1.2k ↗"}
          </span>
        </a>{" "}
        <div
          data-menu-search="1"
          style={{
            padding: "var(--cy-space-20) 0",
            borderTop: "1px solid var(--cy-border)",
            borderBottom: "1px solid var(--cy-border)",
            display: "flex",
            flexDirection: "row",
            gap: "var(--cy-space-12)",
            alignItems: "center",
            cursor: "pointer",
          }}
        >
          {" "}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: "0" }}>
            <circle cx="7" cy="7" r="5" stroke="var(--cy-muted)" strokeWidth="1.5" />
            <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="var(--cy-muted)" strokeWidth="1.5" />
          </svg>{" "}
          <span
            style={{
              fontFamily: "Poppins, Inter, sans-serif",
              fontWeight: "500",
              fontSize: "1.375rem",
              lineHeight: "28px",
              letterSpacing: "-0.4px",
              color: "var(--cy-fg)",
            }}
          >
            {"Search docs"}
          </span>{" "}
        </div>{" "}
      </div>{" "}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "var(--cy-space-32)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--cy-space-8)",
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
            textTransform: "uppercase",
            color: "rgba(var(--cy-muted-rgb),0.5)",
          }}
        >
          {"install"}
        </span>{" "}
        <div
          style={{
            borderRadius: "4px",
            border: "1px solid var(--cy-faint)",
            background: "var(--cy-surface)",
            padding: "var(--cy-space-12) var(--cy-space-16)",
            display: "flex",
            flexDirection: "row",
            gap: "var(--cy-space-12)",
            alignItems: "center",
          }}
        >
          {" "}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontSize: "0.8125rem",
              lineHeight: "18px",
              color: "var(--cy-muted)",
            }}
          >
            {"$"}
          </span>{" "}
          <span
            style={{
              fontFamily: '"Geist Mono", ui-monospace, Menlo, monospace',
              fontSize: "0.8125rem",
              lineHeight: "18px",
              color: "var(--cy-accent)",
            }}
          >
            <span className="sc-interp">{"npx"}</span>
            <span style={{ color: "var(--cy-fg)" }}>
              {" "}
              <span className="sc-interp">{"@cookieyes/cli init"}</span>
            </span>
          </span>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
