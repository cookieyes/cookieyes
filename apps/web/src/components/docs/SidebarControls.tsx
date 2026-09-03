"use client";

import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from "react";

/**
 * Storage key the package switcher writes the reader's chosen package to.
 *
 * Originally this was meant to drive Fumadocs' `<Tabs groupId persist>`, but fumadocs-ui 16
 * no longer implements `groupId`/`persist` at all — `TabsProps` declares neither prop, and
 * neither `tabs.js` nor `codeblock.js` contains the string (verified against 16.15.1). So
 * this key currently feeds nothing but the switcher's own memory across navigations, plus
 * the `?pkg=` deep links from the landing page.
 *
 * If per-package content blocks are wanted later, they will need a switcher-aware component
 * of our own reading this key — the library will not wire it up for us.
 */
const PACKAGE_GROUP_ID = "cy-package";

interface PackageOption {
  /** Value written to storage; also the `?pkg=` deep-link value. */
  id: string;
  /** Full package name, shown in the trigger and the list. */
  name: string;
  /** Framework logo, a 24x24 viewBox rendered inside .cy-doc-pi. */
  logo: ReactNode;
  /** Right-aligned hint in the list. */
  hint: string;
}

/**
 * The three frameworks a reader picks between, per the design's .pdrop
 * (docs.html:400-406).
 *
 * `@cookieyes/cli` and `@cookieyes/translations` are deliberately absent: they are
 * not frameworks, so choosing one here answered nothing. Both keep their docs pages,
 * their nav entries and their `PackageBadge` colour keys — only the switcher is
 * framework-only.
 */
const PACKAGES: PackageOption[] = [
  { id: "nextjs", name: "@cookieyes/nextjs", logo: <NextjsLogo />, hint: "Next.js" },
  { id: "react", name: "@cookieyes/react", logo: <ReactLogo />, hint: "React" },
  { id: "core", name: "@cookieyes/core", logo: <JavaScriptLogo />, hint: "JavaScript" },
];

/**
 * Package switcher and version select, mounted as the sidebar banner. Together they
 * reproduce the design's .psw and .vsel controls above the nav tree.
 */
export function SidebarControls({ versions }: { versions: string[] }) {
  return (
    <div className="cy-doc-sb-controls">
      <PackageSwitcher />
      <VersionSelect versions={versions} />
      <div className="cy-doc-sb-rule" aria-hidden="true" />
    </div>
  );
}

/**
 * The design's .psw dropdown, headed by the .psw-h label (docs.html:397).
 *
 * What it does today: remembers the reader's package across navigations and accepts a
 * `?pkg=` deep link. Nothing else on screen reacts to it yet — per-framework content
 * blocks would need the switcher-aware component described above. Kept a real control
 * rather than a decorative one so that pass stays additive.
 */
function PackageSwitcher() {
  const [selected, setSelected] = useState<PackageOption>(() => {
    const fallback = PACKAGES[0];
    if (!fallback) throw new Error("PACKAGES must not be empty");
    return fallback;
  });
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const labelId = useId();
  const nameId = useId();

  // Resolved after mount, for two reasons: the stored value is per-browser, so
  // reading it during render would make the server and first client render
  // disagree; and `?pkg=` is read from location rather than useSearchParams, which
  // would opt the whole docs route out of static prerendering unless the sidebar
  // were wrapped in a Suspense boundary.
  //
  // `?pkg=` lets a link choose the package — the landing page's Next.js and React
  // calls to action arrive that way, so the reader lands already set to the
  // framework they picked. It beats the stored preference, which is the point of
  // following such a link.
  useEffect(() => {
    let requested: string | null = null;
    try {
      requested = new URLSearchParams(window.location.search).get("pkg");
    } catch {
      // Malformed query string — fall through to the stored preference.
    }

    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(PACKAGE_GROUP_ID) ?? localStorage.getItem(PACKAGE_GROUP_ID);
    } catch {
      // Private mode or blocked storage — fall back to the default package.
    }

    // A value stored before the switcher went framework-only (`cli`, `translations`)
    // no longer matches, and this guard leaves the default selected — which is why
    // dropping those two options needs no migration pass.
    const match = PACKAGES.find((pkg) => pkg.id === (requested ?? stored));
    if (!match) return;
    setSelected(match);

    // Persist a linked-to package so it survives the next navigation, the same as
    // one chosen from the dropdown.
    if (requested === match.id) {
      try {
        sessionStorage.setItem(PACKAGE_GROUP_ID, match.id);
        localStorage.setItem(PACKAGE_GROUP_ID, match.id);
      } catch {
        // Storage unavailable; the choice still applies for this render.
      }
    }
  }, []);

  const choose = useCallback((pkg: PackageOption) => {
    setSelected(pkg);
    setOpen(false);
    try {
      sessionStorage.setItem(PACKAGE_GROUP_ID, pkg.id);
      localStorage.setItem(PACKAGE_GROUP_ID, pkg.id);
    } catch {
      // Storage unavailable; the choice still applies for this render.
    }
  }, []);

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
        {PACKAGES.map((pkg) => (
          <button
            type="button"
            key={pkg.id}
            role="option"
            aria-selected={pkg.id === selected.id}
            className="cy-doc-pdi"
            data-selected={pkg.id === selected.id}
            onClick={() => choose(pkg)}
          >
            {/* The logo is decorative — `hint` already names the framework in text. */}
            <span className="cy-doc-pi" aria-hidden="true">
              {pkg.logo}
            </span>
            {pkg.name}
            <small>{pkg.hint}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The design's .vsel row.
 *
 * Only the versions that actually have content are offered. The design mocks
 * v1.4–v1.1, but Fumadocs has no built-in versioning and no older content exists,
 * so listing them would be four options that silently do nothing. Once versioned
 * content lands, pass the full list in.
 */
function VersionSelect({ versions }: { versions: string[] }) {
  const id = useId();
  const single = versions.length <= 1;

  return (
    <div className="cy-doc-vsel">
      <label className="cy-doc-vsel-label" htmlFor={id}>
        Version
      </label>
      <select id={id} className="cy-doc-vsel-select" defaultValue={versions[0]} disabled={single}>
        {versions.map((version, index) => (
          <option key={version} value={version}>
            {index === 0 ? `${version} (latest)` : version}
          </option>
        ))}
      </select>
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
