import { Accordion, Accordions } from "fumadocs-ui/components/accordion";
import { Callout } from "fumadocs-ui/components/callout";
import { Card, Cards } from "fumadocs-ui/components/card";
import { CodeBlockTabsList, CodeBlockTabsTrigger } from "fumadocs-ui/components/codeblock";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps, ComponentType } from "react";
import * as DocsComponents from "@/components/docs";
import {
  CodeBlockTabsWithCopyContext,
  CodeTabsCopyButton,
  DocsPre,
} from "@/components/docs/CodeTabsCopy";

/**
 * Wraps a Fumadocs component so it carries one of our own classes.
 *
 * Styling these by structure is not safe: Fumadocs puts `data-card` on heading
 * anchor links as well as on Card, so a `[data-card]` rule boxes every heading on
 * the page. Nothing guarantees an internal hook stays put across versions either.
 * Giving each block a `cy-doc-*` class we control makes the CSS say what it means
 * and survive upgrades.
 */
function withClass<P extends { className?: string | undefined }>(
  Component: ComponentType<P>,
  className: string,
) {
  return function Wrapped(props: P) {
    return (
      <Component {...props} className={[className, props.className].filter(Boolean).join(" ")} />
    );
  };
}

/**
 * Maps the raw author `type` string a <Callout> was written with to the design's
 * literal glyph character (docs.html:225's `.ca-ic`: ℹ/⚠/✓/✦ for info/warn/ok/tip).
 * Keyed off both the raw alias AND Fumadocs' own resolved name for each pair
 * (info/warn/ok/tip vs warning/success/idea) — the same dual-alias shape the
 * variant-tint rules in theme.css already use, since Fumadocs' resolveAlias()
 * collapses "tip" into "info" (and "warn" into "warning") before Callout ever
 * inspects `type` itself, but this function receives the ORIGINAL author string via
 * mdx.tsx's own destructured `type` prop, not Fumadocs' resolved one.
 */
function calloutGlyph(type: string | undefined): string | undefined {
  switch (type) {
    case "info":
      return "ℹ";
    case "warn":
    case "warning":
      return "⚠";
    case "ok":
    case "success":
      return "✓";
    case "tip":
    case "idea":
      return "✦";
    default:
      return undefined;
  }
}

/**
 * MDX components available to every docs page.
 *
 * Three groups, in override order:
 *   1. Fumadocs defaults — headings, links, code blocks, images.
 *   2. Fumadocs building blocks the design leans on, each tagged with a
 *      `cy-doc-*` class so the design's styling has something stable to attach
 *      to — the design's callout variants (info/warn/ok/tip/err) map onto
 *      Callout's info/warn/success/idea/error, its numbered walkthroughs onto
 *      Steps, its npm/pnpm/yarn/bun code switchers onto Tabs, its troubleshooting
 *      disclosures onto Accordions. Its API tables render through `PropsTable`
 *      (group 3, below) — a real `<table>`, not a Fumadocs component, since
 *      `TypeTable` emits no table semantics to attach the design's grid to.
 *   3. CookieYes docs components — the blocks Fumadocs has no equivalent for,
 *      transcribed from the design prototype.
 *
 * Registering globally (rather than importing per page) keeps the MDX free of
 * import headers, which matters because the content is authored by non-frontend
 * contributors.
 */
export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,

    // Markdown tables carry no class of their own; give them one.
    table: (props: ComponentProps<"table">) => (
      <table {...props} className={["cy-doc-table", props.className].filter(Boolean).join(" ")} />
    ),

    // Standalone (non-tabbed) code blocks — mirrors defaultMdxComponents' own `pre` mapping,
    // adding only the class hook `.cy-doc-cb` gives §8.2's header/copy-button/scroll rules
    // something stable to target instead of the bare `figure.shiki` structural selector.
    // Factored into DocsPre (CodeTabsCopy.tsx) because it needs to read
    // InsideCodeTabsContext, a hook — this module has no "use client" directive.
    pre: DocsPre,

    // Troubleshoot's per-question box (.ts-q, docs.html:309) needs a stable class on
    // the per-item AccordionItem; Accordion() already forwards arbitrary extra props
    // (including className) onto it — see design doc §2.8/§5.
    Accordion: withClass(Accordion, "cy-doc-ts-q"),
    Accordions: withClass(Accordions, "cy-doc-accordions"),

    // Callout: class hook as before, PLUS a data-cy-variant carrying the RAW type string the
    // author wrote (before Fumadocs' own resolveAlias() collapses "warn"->"warning" and
    // "tip"->"info" internally, see design doc §2.3) — §8.3's variant-tint rules key off this,
    // not off Fumadocs' internal (and, for "tip", wrong) resolved type. `icon` is a real,
    // verified Callout prop (fumadocs-ui/dist/components/callout.js): passing it replaces
    // Fumadocs' own lucide icon outright, in the same position, with the design's literal glyph
    // character (docs.html:225's `.ca-ic`) — keyed off the same raw type string for the same
    // "tip" reason. "error"/"err" gets no override: docs.html defines `.ca-err`'s colours but
    // never pairs it with a live `.ca-ic` glyph anywhere in the prototype, so calloutGlyph()
    // returns undefined there and Callout falls through to its own default icon rather than one
    // invented for this fix.
    Callout: ({ type, className, ...rest }: ComponentProps<typeof Callout>) => {
      const glyph = calloutGlyph(type);
      return (
        <Callout
          type={type}
          className={["cy-doc-callout", className].filter(Boolean).join(" ")}
          data-cy-variant={type ?? "info"}
          icon={glyph ? <span className="cy-doc-ca-ic">{glyph}</span> : undefined}
          {...rest}
        />
      );
    },

    Card: withClass(Card, "cy-doc-card"),
    Cards: withClass(Cards, "cy-doc-cards"),

    // Tabbed code blocks (remarkNpm's package-manager switcher, see design doc §2.7). These are
    // NOT the generic <Tabs>/<Tab> below — a separate component pair, so this cannot collide with
    // a hand-authored <Tabs> block. CodeBlockTabsWithCopyContext (not the bare Fumadocs
    // CodeBlockTabs) marks every pre nested inside as "in a tab group" — see DocsPre above.
    CodeBlockTabs: withClass(CodeBlockTabsWithCopyContext, "cy-doc-cb cy-doc-cb-tabs"),
    // The design's copy control sits IN the tab bar, pushed right (docs.html:539/551's `.cp`,
    // `style="margin-left:auto"`), not in a separate header row or its own per-pane position —
    // appended here as an extra child alongside whatever triggers remarkNpm generated.
    CodeBlockTabsList: (props: ComponentProps<typeof CodeBlockTabsList>) => (
      <CodeBlockTabsList
        {...props}
        className={["cy-doc-ct", props.className].filter(Boolean).join(" ")}
      >
        {props.children}
        <CodeTabsCopyButton />
      </CodeBlockTabsList>
    ),
    CodeBlockTabsTrigger: withClass(CodeBlockTabsTrigger, "cy-doc-ct-b"),

    Step,
    // Steps accepts only `children`, so it gets a wrapper rather than a class.
    Steps: (props: ComponentProps<typeof Steps>) => (
      <div className="cy-doc-steps">
        <Steps {...props} />
      </div>
    ),
    Tab,
    Tabs,
    ...DocsComponents,
    ...components,
  };
}

export const useMDXComponents = getMDXComponents;
