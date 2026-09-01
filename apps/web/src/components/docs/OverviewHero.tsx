import type { ReactNode } from "react";

interface OverviewHeroProps {
  title: string;
  /** One-line positioning statement under the title. */
  subtitle?: ReactNode;
  /** Short mono chips — bundle size, licence, supported frameworks. */
  badges?: string[];
  children?: ReactNode;
}

/**
 * Panel that opens the docs index. Deliberately a `<section>` with its own heading
 * level rather than an `h1` — `DocsTitle` already supplies the page's `h1`.
 */
export function OverviewHero({ title, subtitle, badges, children }: OverviewHeroProps) {
  return (
    <section className="cy-doc-hero">
      <h2 className="cy-doc-hero-title">{title}</h2>
      {subtitle ? <p className="cy-doc-hero-sub">{subtitle}</p> : null}
      {badges?.length ? (
        <div className="cy-doc-hero-badges">
          {badges.map((badge) => (
            <span className="cy-doc-hero-badge" key={badge}>
              {badge}
            </span>
          ))}
        </div>
      ) : null}
      {children}
    </section>
  );
}
