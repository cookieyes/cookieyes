import type { ReactNode } from "react";

interface ChangelogPackageVersion {
  /** Scoped package name without the `@cookieyes/` prefix, e.g. "react". */
  name: string;
  /** The exact npm version published for this package in this release, e.g. "0.5.0". */
  version: string;
}

interface ChangelogEntryProps {
  /** Umbrella SDK version for this release, e.g. "v1.4.0". Plain text: this is a single
   *  site-wide release number, never a per-package composition. */
  version: string;
  /** Release date as an ISO 8601 calendar date, e.g. "2026-08-17" — the format the design
   *  renders (docs.html:1784). Rendered verbatim; nothing parses or reformats it. */
  date: string;
  /** One-line, c15t-style headline shown under the version/date. */
  title: string;
  /** Packages that published a new version in this release, in display order. A package that
   *  didn't move this cycle simply isn't listed — omit it, don't repeat its old version. */
  packages: ChangelogPackageVersion[];
  /** Draws the timeline dot in the accent color. Set this whenever — and only when — the release
   *  contains a `<ChangelogGroup kind="Breaking">`. It is not a general "big release" flag; it
   *  mirrors the one thing a reader scanning the dots actually needs to know: "does this one
   *  break something I depend on." */
  major?: boolean | undefined;
  /** Zero or more `<ChangelogGroup>` blocks. A release with nothing to classify (e.g. the very
   *  first stable release) may pass a bare markdown `<ul>` instead. */
  children: ReactNode;
}

/**
 * One release on the changelog timeline: a dot on a vertical rule, the version/date/title
 * block, the package-version chip row, then whatever `ChangelogGroup`s (and their markdown
 * lists) the author put in `children`. Entries stack in reverse-chronological order in the MDX.
 */
export function ChangelogEntry({
  version,
  date,
  title,
  packages,
  major = false,
  children,
}: ChangelogEntryProps) {
  return (
    <div className="cy-doc-log" data-major={String(major)} data-testid="changelog-entry">
      <div className="cy-doc-log-version">{version}</div>
      <div className="cy-doc-log-date">{date}</div>
      <div className="cy-doc-log-title">{title}</div>
      <div className="cy-doc-log-pkgs">
        {packages.map((pkg) => (
          <code key={pkg.name}>
            @cookieyes/{pkg.name} {pkg.version}
          </code>
        ))}
      </div>
      {children}
    </div>
  );
}

type ChangelogGroupKind = "Added" | "Changed" | "Fixed" | "Breaking";

interface ChangelogGroupProps {
  kind: ChangelogGroupKind;
  /** A markdown list written directly as MDX children. */
  children: ReactNode;
}

/**
 * An uppercase, letterspaced, uncolored mono heading classifying the markdown list that follows
 * it as Added/Changed/Fixed/Breaking, per Keep a Changelog.
 */
export function ChangelogGroup({ kind, children }: ChangelogGroupProps) {
  return (
    <>
      <div className="cy-doc-log-grp" data-testid="changelog-group" data-kind={kind}>
        {kind}
      </div>
      {children}
    </>
  );
}
