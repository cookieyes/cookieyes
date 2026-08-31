"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

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
  /** Value written to storage; also the data-pkg colour key. */
  id: string;
  /** Full package name, shown in the trigger and the list. */
  name: string;
  /** Initial shown in the colour chip. */
  mark: string;
  /** Right-aligned hint in the list. */
  hint: string;
}

const PACKAGES: PackageOption[] = [
  { id: "nextjs", name: "@cookieyes/nextjs", mark: "N", hint: "Next.js" },
  { id: "react", name: "@cookieyes/react", mark: "R", hint: "React" },
  { id: "core", name: "@cookieyes/core", mark: "C", hint: "Headless" },
  { id: "cli", name: "@cookieyes/cli", mark: "✦", hint: "CLI" },
  { id: "translations", name: "@cookieyes/translations", mark: "T", hint: "i18n" },
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
 * The design's .psw dropdown.
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
      <button
        type="button"
        className="cy-doc-psw"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="cy-doc-psw-label">
          {/* The design hides the chip on the trigger (.psw > .psw-l > .pi) and
              shows it only on the list rows. */}
          <span className="cy-doc-psw-name">{selected.name}</span>
        </span>
        <Chevron />
      </button>

      <div className="cy-doc-pdrop" id={listId} role="listbox" data-open={open} hidden={!open}>
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
            <span className="cy-doc-pkg-mark" data-pkg={pkg.id} aria-hidden="true">
              {pkg.mark}
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
