import type { CssVariablesReferenceData } from "@/lib/css-variables-reference-types";
import cssVariablesReference from "../../../.generated/css-variables-reference.json";

const data = cssVariablesReference as CssVariablesReferenceData;

export interface CssVariableConsumersProps {
  /** One of the 12 `--cy-*` token names, e.g. `"--cy-primary"`. */
  token: string;
}

/**
 * Renders the reverse index for exactly one token: every consuming selector
 * (with the property it sets and, if not global, the media context), and —
 * if any other token aliases this one — an explicit "also drives" line. See
 * design §2.2 (AC3, "shared/general-purpose values called out explicitly")
 * and §5.
 *
 * Throws at module-render time if `token` has zero consumers in the
 * generated data — should be structurally impossible post-generator, but
 * this is the same defense-in-depth `ConfigOptionsTable` applies to its own
 * generated data.
 */
export function CssVariableConsumers({ token }: CssVariableConsumersProps) {
  const entry = data.tokens.find((t) => t.name === token);
  if (!entry) {
    throw new Error(
      `<CssVariableConsumers token="${token}"> — no such token in the generated CSS variables ` +
        `reference. Check the name, or re-run generate-css-variables-reference.mjs.`,
    );
  }
  if (entry.consumers.length === 0) {
    throw new Error(
      `<CssVariableConsumers token="${token}"> has zero consumers in the generated data. If this is ` +
        `expected (a newly-added token with no rule wired up yet), fix the stylesheet before ` +
        `documenting it here — a token with no consumer shouldn't be advertised as "where it applies."`,
    );
  }

  return (
    <div>
      <ul>
        {entry.consumers.map((consumer, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: consumer entries are generated, order-stable, and have no natural unique key
          <li key={i}>
            <code>{consumer.selector}</code> — <code>{consumer.property}</code>
            {consumer.media ? (
              <>
                {" "}
                (inside <code>{consumer.media}</code>)
              </>
            ) : null}
          </li>
        ))}
      </ul>
      {entry.aliasedBy.length > 0 ? (
        <p>
          Also drives (unless overridden):{" "}
          {entry.aliasedBy.map((aliased, i) => (
            <span key={aliased}>
              {i > 0 ? ", " : ""}
              <code>{aliased}</code>
            </span>
          ))}
        </p>
      ) : null}
      {entry.aliasOf ? (
        <p>
          Itself an alias of <code>{entry.aliasOf.toToken}</code>
          {entry.aliasOf.isExpression ? (
            <>
              , via <code>{entry.aliasOf.transform}</code>
            </>
          ) : (
            " (untransformed — the exact same value)"
          )}
          .
        </p>
      ) : null}
    </div>
  );
}
