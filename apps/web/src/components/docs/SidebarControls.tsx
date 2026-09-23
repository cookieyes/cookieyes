"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";
import {
  DEFAULT_FRAMEWORK,
  FRAMEWORK_LABEL,
  FRAMEWORKS,
  type Framework,
  frameworkOf,
} from "@/lib/framework-docs";

/**
 * Remembers the framework a reader last chose, so `/docs` links from the landing page and
 * the header can send them back to it. The URL is what decides what a page shows; this is
 * only a default for links that do not name one.
 */
export const FRAMEWORK_STORAGE_KEY = "cy-package";

export function rememberFramework(framework: Framework): void {
  try {
    localStorage.setItem(FRAMEWORK_STORAGE_KEY, framework);
  } catch {
    // Private mode or blocked storage — the URL still carries the choice.
  }
}

interface PackageOption {
  id: Framework;
  /** Full package name, shown in the trigger and the list. */
  name: string;
  /** Framework logo, a 24x24 viewBox rendered inside .cy-doc-pi. */
  logo: ReactNode;
  /** Right-aligned hint in the list. */
  hint: string;
}

/**
 * The three frameworks a reader picks between, per the design's .pdrop
 * (docs.html:400-406). Each is a docs root: `/docs/nextjs`, `/docs/react`, `/docs/core`.
 *
 * `@cookieyes/cli` and `@cookieyes/translations` are deliberately absent: they are
 * not frameworks, so choosing one here answered nothing.
 */
const PACKAGES: Record<Framework, PackageOption> = {
  nextjs: {
    id: "nextjs",
    name: "@cookieyes/nextjs",
    logo: <NextjsLogo />,
    hint: FRAMEWORK_LABEL.nextjs,
  },
  react: {
    id: "react",
    name: "@cookieyes/react",
    logo: <ReactLogo />,
    hint: FRAMEWORK_LABEL.react,
  },
  core: {
    id: "core",
    name: "@cookieyes/core",
    logo: <JavaScriptLogo />,
    hint: FRAMEWORK_LABEL.core,
  },
};

interface SidebarControlsProps {
  /**
   * Which pages exist under each framework, as `section/page` paths, computed on the
   * server from the docs source. Lets the switcher take the reader to the same page under
   * the framework they chose when it exists there, and to that framework's start page when
   * it does not — a JavaScript reader leaving a React hooks page, for instance.
   */
  available: Record<Framework, string[]>;
}

/**
 * Framework switcher, mounted as the sidebar banner — the design's .psw control above the
 * nav tree. Choosing a framework navigates: the docs are published once per framework,
 * so the switch is a change of URL, and the sidebar, the examples and the header all
 * follow from it. Nothing on the page is swapped in place.
 *
 * Absent across the changelog, where the sidebar is a list of releases rather than the
 * docs tree and no page varies by framework — the design hides its whole `#sbDocs` block,
 * switcher included, for that section.
 */
export function SidebarControls({ available }: SidebarControlsProps) {
  const pathname = usePathname();
  if (pathname.startsWith("/docs/changelog")) return null;

  return (
    <div className="cy-doc-sb-controls">
      <PackageSwitcher available={available} />
      <div className="cy-doc-sb-rule" aria-hidden="true" />
    </div>
  );
}

/** The design's .psw dropdown, headed by the .psw-h label (docs.html:397). */
function PackageSwitcher({ available }: SidebarControlsProps) {
  const pathname = usePathname();
  const router = useRouter();
  const current = frameworkOf(pathname) ?? DEFAULT_FRAMEWORK;
  const selected = PACKAGES[current];

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();
  const nameId = useId();

  // Whatever framework the URL names is the reader's current choice; keep the stored
  // default in step so a later `/docs` link lands them here again.
  useEffect(() => {
    rememberFramework(current);
  }, [current]);

  const choose = useCallback(
    (framework: Framework) => {
      setOpen(false);
      if (framework === current) return;
      rememberFramework(framework);

      const rest = pathname.replace(/^\/docs\/[^/]+\/?/, "");
      const exists = rest === "" || available[framework].includes(rest);
      router.push(exists ? `/docs/${framework}${rest ? `/${rest}` : ""}` : `/docs/${framework}`);
    },
    [available, current, pathname, router],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="cy-doc-psw-root" ref={rootRef}>
      <span className="cy-doc-psw-h" id={labelId}>
        Choose a Framework
      </span>
      <button
        type="button"
        className="cy-doc-psw"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        // The design's heading is a bare <span>, invisible to assistive tech. Pairing it
        // with the package name makes the trigger announce "Choose a Framework,
        // @cookieyes/nextjs" rather than the package name alone.
        aria-labelledby={`${labelId} ${nameId}`}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="cy-doc-psw-label">
          <span className="cy-doc-pi" aria-hidden="true">
            {selected.logo}
          </span>
          <span className="cy-doc-psw-name" id={nameId}>
            {selected.name}
          </span>
        </span>
        <Chevron />
      </button>

      <div
        className="cy-doc-pdrop"
        id={listId}
        role="listbox"
        aria-label="Choose a Framework"
        data-open={open}
        hidden={!open}
      >
        {FRAMEWORKS.map((id) => {
          const pkg = PACKAGES[id];
          return (
            <button
              type="button"
              key={pkg.id}
              role="option"
              aria-selected={pkg.id === selected.id}
              className="cy-doc-pdi"
              data-selected={pkg.id === selected.id}
              onClick={() => choose(pkg.id)}
            >
              {/* The logo is decorative — `hint` already names the framework in text. */}
              <span className="cy-doc-pi" aria-hidden="true">
                {pkg.logo}
              </span>
              {pkg.name}
              <small>{pkg.hint}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Framework logos ───────────────────────────────────────────────────────────
   Transcribed from the design's .pdrop rows (docs.html:401-406).

   Two colour regimes, deliberately: the Next.js wordmark is monochrome, so it reads
   from the docs tokens and inverts with the theme. React's and JavaScript's marks are
   third-party brand colours — fixed in both themes, because a brand mark that flips
   with the colour scheme stops being the brand mark. Same split the landing page's
   WorksWithYourStack already draws.                                                */

/** Next.js — monochrome mark; inverts with the docs theme (design's --tx / --bg). */
function NextjsLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="var(--cy-doc-tx)" />
      <path
        d="M9 7.6V16.4M9 7.6L15.6 17M15.4 7.6V13.2"
        stroke="var(--cy-doc-bg)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** React — brand cyan, fixed in both themes. */
function ReactLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="1.9" fill="#0EA5C6" />
      <g stroke="#0EA5C6" strokeWidth="1.1">
        <ellipse cx="12" cy="12" rx="10" ry="3.9" />
        <ellipse cx="12" cy="12" rx="10" ry="3.9" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10" ry="3.9" transform="rotate(120 12 12)" />
      </g>
    </svg>
  );
}

/** JavaScript — brand yellow, fixed in both themes. */
function JavaScriptLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect width="24" height="24" rx="3" fill="#F7DF1E" />
      <text
        x="12.5"
        y="17"
        textAnchor="middle"
        fontFamily="var(--font-mono)"
        fontSize="11"
        fontWeight="700"
        fill="#14142A"
      >
        JS
      </text>
    </svg>
  );
}

function Chevron() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
