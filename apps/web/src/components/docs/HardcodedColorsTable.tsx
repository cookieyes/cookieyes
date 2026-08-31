import type { CssVariablesReferenceData } from "@/lib/css-variables-reference-types";
import cssVariablesReference from "../../../.generated/css-variables-reference.json";

const data = cssVariablesReference as CssVariablesReferenceData;

/**
 * Renders every hardcoded-colour declaration in `cookieyes.css` that has no
 * `--cy-*` token behind it — "things no variable controls." Each row names
 * the element in plain language, the literal selector/property/value, and a
 * working override selector (verified to win outright against the SDK's own
 * rule, not merely tie — see design §2.2(b) and the sidecar's own doc
 * comment). The backdrop row is visually flagged via `followUpCandidate`.
 * See design §5.
 */
export function HardcodedColorsTable() {
  if (data.hardcoded.length === 0) {
    throw new Error(
      "<HardcodedColorsTable> has zero entries in the generated CSS variables reference. " +
        "Re-run generate-css-variables-reference.mjs.",
    );
  }

  return (
    <table className="cy-doc-table">
      <thead>
        <tr>
          <th>Element</th>
          <th>Declaration</th>
          <th>Override selector</th>
        </tr>
      </thead>
      <tbody>
        {data.hardcoded.map((entry) => (
          <tr key={`${entry.selector}|${entry.property}|${entry.value}`}>
            <td>
              {entry.plainLanguageName}
              {entry.followUpCandidate ? (
                <>
                  {" "}
                  <em>(no dedicated token yet — see below)</em>
                </>
              ) : null}
            </td>
            <td>
              <code>
                {entry.selector} {"{"} {entry.property}: {entry.value}; {"}"}
              </code>
            </td>
            <td>
              <code>{entry.overrideSelector}</code>
              <br />
              {entry.overrideNote}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
