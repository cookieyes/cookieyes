import type { CssVariablesReferenceData } from "@/lib/css-variables-reference-types";
import cssVariablesReference from "../../../.generated/css-variables-reference.json";

const data = cssVariablesReference as CssVariablesReferenceData;

export interface TokenDefaultsBlockProps {
  scheme: "light" | "dark";
}

/**
 * Renders a single fenced `css` code block containing all 12 tokens at their
 * default value for the requested scheme, pre-rendered by
 * `generate-css-variables-reference.mjs` so a token added later can't
 * silently be missing from Story 3's "every variable at its default" claim.
 * See design §5.
 */
export function TokenDefaultsBlock({ scheme }: TokenDefaultsBlockProps) {
  const block = data.defaultsBlocks[scheme];
  if (!block) {
    throw new Error(
      `<TokenDefaultsBlock scheme="${scheme}"> — no pre-rendered block for this scheme in the ` +
        `generated CSS variables reference. Re-run generate-css-variables-reference.mjs.`,
    );
  }
  return (
    <pre>
      <code className="language-css">{block}</code>
    </pre>
  );
}
