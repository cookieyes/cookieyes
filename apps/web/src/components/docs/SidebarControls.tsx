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
 * (docs.html:400-406). Each is a docs root: `/docs/nextjs`, `/docs/react`, `/docs/vue`,
 * `/docs/nuxt`, `/docs/svelte`, `/docs/sveltekit`, `/docs/astro`, `/docs/core`.
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
  vue: {
    id: "vue",
    name: "@cookieyes/vue",
    logo: <VueLogo />,
    hint: FRAMEWORK_LABEL.vue,
  },
  nuxt: {
    id: "nuxt",
    name: "@cookieyes/nuxt",
    logo: <NuxtLogo />,
    hint: FRAMEWORK_LABEL.nuxt,
  },
  svelte: {
    id: "svelte",
    name: "@cookieyes/svelte",
    logo: <SvelteLogo />,
    hint: FRAMEWORK_LABEL.svelte,
  },
  // SvelteKit's own mark is the Svelte one; the package name and the hint tell the two apart.
  sveltekit: {
    id: "sveltekit",
    name: "@cookieyes/sveltekit",
    logo: <SvelteLogo />,
    hint: FRAMEWORK_LABEL.sveltekit,
  },
  astro: {
    id: "astro",
    name: "@cookieyes/astro",
    logo: <AstroLogo />,
    hint: FRAMEWORK_LABEL.astro,
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

/** Vue: the two-chevron mark in brand green and navy, fixed in both themes. */
function VueLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2 3h4.6L12 12.4 17.4 3H22L12 20.5z" fill="#41B883" />
      <path d="M6.6 3H10l2 3.5L14 3h3.4L12 12.4z" fill="#35495E" />
    </svg>
  );
}

/** Nuxt: the mountain mark in brand green, fixed in both themes. */
function NuxtLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M13.46 19.83h8.93c.28 0 .56-.07.8-.21a1.6 1.6 0 0 0 .6-.57 1.53 1.53 0 0 0 0-1.57L17.79 7.17a1.6 1.6 0 0 0-.59-.57 1.65 1.65 0 0 0-1.61 0 1.6 1.6 0 0 0-.59.57l-1.53 2.57-3-5.02a1.6 1.6 0 0 0-.59-.58 1.65 1.65 0 0 0-1.61 0 1.6 1.6 0 0 0-.59.58L.22 17.48a1.53 1.53 0 0 0 0 1.57 1.6 1.6 0 0 0 .59.57c.25.14.52.21.81.21h5.6c2.22 0 3.85-.95 4.98-2.79l2.73-4.6 1.47-2.45 4.39 7.38h-5.86zm-6.34-2.46H3.21l5.86-9.85L12 12.44l-1.96 3.29c-.75 1.2-1.6 1.63-2.92 1.63z"
        fill="#00DC82"
      />
    </svg>
  );
}

/** Svelte: the S mark in brand orange, fixed in both themes. */
function SvelteLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.1 3.2C18 .2 13.9-.7 10.9 1.2L5.6 4.6a6.07 6.07 0 0 0-2.7 4.1 6.4 6.4 0 0 0 .6 4.1 6.07 6.07 0 0 0-.9 2.3 6.47 6.47 0 0 0 1.1 4.9c2.1 3 6.2 3.9 9.2 2l5.3-3.4a6.07 6.07 0 0 0 2.7-4.1 6.4 6.4 0 0 0-.6-4.1 6.07 6.07 0 0 0 .9-2.3 6.47 6.47 0 0 0-1.1-4.9"
        fill="#FF3E00"
      />
      <path
        d="M10.4 20.6a4.2 4.2 0 0 1-4.5-1.7 3.9 3.9 0 0 1-.7-2.9l.1-.5.1-.3.3.2a6.9 6.9 0 0 0 2.1 1l.2.1v.2a1.2 1.2 0 0 0 .2.8 1.27 1.27 0 0 0 1.4.5 1.2 1.2 0 0 0 .3-.1l5.3-3.4a1.1 1.1 0 0 0 .5-.7 1.2 1.2 0 0 0-.2-.9 1.27 1.27 0 0 0-1.4-.5 1.2 1.2 0 0 0-.3.1l-2 1.3a3.9 3.9 0 0 1-1.1.5 4.2 4.2 0 0 1-4.5-1.7 3.9 3.9 0 0 1-.7-2.9 3.6 3.6 0 0 1 1.6-2.5l5.3-3.4a3.9 3.9 0 0 1 1.1-.5 4.2 4.2 0 0 1 4.5 1.7 3.9 3.9 0 0 1 .7 2.9l-.1.5-.1.3-.3-.2a6.9 6.9 0 0 0-2.1-1l-.2-.1v-.2a1.2 1.2 0 0 0-.2-.8 1.27 1.27 0 0 0-1.4-.5 1.2 1.2 0 0 0-.3.1L8.4 9.6a1.1 1.1 0 0 0-.5.7 1.2 1.2 0 0 0 .2.9 1.27 1.27 0 0 0 1.4.5 1.2 1.2 0 0 0 .3-.1l2-1.3a3.9 3.9 0 0 1 1.1-.5 4.2 4.2 0 0 1 4.5 1.7 3.9 3.9 0 0 1 .7 2.9 3.6 3.6 0 0 1-1.6 2.5l-5.3 3.4a3.9 3.9 0 0 1-1.1.5"
        fill="#FFFFFF"
      />
    </svg>
  );
}

/** Astro: the rocket mark in brand purple, fixed in both themes. */
function AstroLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.358 20.162c-1.186-1.07-1.532-3.316-1.038-4.944.856 1.026 2.043 1.352 3.272 1.535 1.897.283 3.76.177 5.522-.678.202-.098.388-.229.608-.36.166.473.209.95.151 1.437-.14 1.185-.738 2.1-1.688 2.794-.38.277-.782.525-1.175.787-1.205.804-1.531 1.747-1.078 3.119l.044.148a3.158 3.158 0 0 1-1.407-1.188 3.31 3.31 0 0 1-.544-1.815c-.004-.32-.004-.642-.048-.958-.106-.769-.472-1.113-1.161-1.133-.707-.02-1.267.411-1.415 1.09-.012.053-.028.104-.045.165zm-5.961-4.445s3.24-1.575 6.49-1.575l2.451-7.565c.092-.366.36-.614.662-.614.302 0 .57.248.662.614l2.45 7.565c3.85 0 6.491 1.575 6.491 1.575L16.088.727C15.93.285 15.663 0 15.303 0H8.697c-.36 0-.615.285-.784.727z"
        fill="#BC52EE"
      />
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
