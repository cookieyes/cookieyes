import type { ReactNode } from "react";
import { formatChangelogDate } from "./changelog-date";

interface ReleaseBadgesProps {
  date: string;
  kind?: "release" | "stable" | undefined;
}

export function ReleaseBadges({ date, kind = "release" }: ReleaseBadgesProps) {
  return (
    <div className="cy-doc-rl-badges">
      <span className="cy-doc-cl-date">{formatChangelogDate(date)}</span>
      <span className="cy-doc-cl-kind">{kind}</span>
    </div>
  );
}

interface ReleaseSummaryProps {
  /** Bold lead-in, e.g. "Critical CSS, Geo-Detection and Script Presets" — no trailing period. */
  headline: string;
  children: ReactNode;
}

/* A <div>, not a <p>: MDX wraps this component's block children in their own <p>, and a
   <p> inside a <p> is invalid HTML — the browser closes the outer one, so the server and
   client trees diverge and hydration fails. The child paragraph is set inline in CSS so
   the bold headline and the prose still read as one continuous paragraph. */
export function ReleaseSummary({ headline, children }: ReleaseSummaryProps) {
  return (
    <div className="cy-doc-rl-sum">
      <strong>{headline}.</strong> {children}
    </div>
  );
}

export function ReleaseRule() {
  return <div className="cy-doc-rl-rule" aria-hidden="true" />;
}

interface ReleasePackageVersion {
  /** Scoped name without the `@cookieyes/` prefix, e.g. "react". */
  name: string;
  version: string;
}

/** One npm-install row per package published in this release (§2.8). */
export function ReleaseInstall({ packages }: { packages: ReleasePackageVersion[] }) {
  return (
    <div className="cy-doc-rl-sec">
      {packages.map((pkg) => (
        <div className="cy-doc-rl-inst" key={pkg.name}>
          <span>
            npm i @cookieyes/{pkg.name}@{pkg.version}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ReleaseSource({ version }: { version: string }) {
  return (
    <div className="cy-doc-rl-sec">
      <p>
        Read the full diff and commit history for {version} on{" "}
        <a href="https://github.com/cookieyes/cookieyes/releases" target="_blank" rel="noreferrer">
          GitHub
        </a>
        .
      </p>
    </div>
  );
}
