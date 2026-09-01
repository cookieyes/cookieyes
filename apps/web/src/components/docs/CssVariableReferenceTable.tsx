import type { TypeNode } from "fumadocs-ui/components/type-table";
import type { CssVariablesReferenceData, TokenEntry } from "@/lib/css-variables-reference-types";
import cssVariablesReference from "../../../.generated/css-variables-reference.json";
import { PropsTable } from "./PropsTable";

const data = cssVariablesReference as CssVariablesReferenceData;

// Belt-and-suspenders on top of the generator's own fail-closed check 2 —
// catches a stale `.generated/` artifact that wasn't regenerated after the
// SDK's ThemeVars surface changed. See design §5.
if (data.tokens.length !== 12) {
  throw new Error(
    `<CssVariableReferenceTable> expected exactly 12 tokens in the generated CSS variables ` +
      `reference, found ${data.tokens.length}. Re-run generate-css-variables-reference.mjs.`,
  );
}

function toTypeNode(token: TokenEntry): TypeNode {
  const darkNote = token.defaultDark === null ? "unchanged" : token.defaultDark;
  return {
    type: token.type,
    required: false,
    default: token.defaultLight,
    description: (
      <>
        <p>{token.description}</p>
        <p>
          <strong>theme key:</strong>{" "}
          {token.configKey ? <code>{token.configKey}</code> : "— (derived)"}
        </p>
        <p>
          <strong>Dark default:</strong> <code>{darkNote}</code>
        </p>
      </>
    ),
  };
}

/**
 * Renders every `--cy-*` token as a `PropsTable` — one row per token, in
 * `ThemeVars` declaration order. Reads `.generated/css-variables-reference.json`,
 * written by `scripts/generate-css-variables-reference.mjs` as part of
 * `apps/web`'s build chain. See design §5.
 */
export function CssVariableReferenceTable() {
  const type = Object.fromEntries(data.tokens.map((token) => [token.name, toTypeNode(token)]));
  return <PropsTable type={type} />;
}
